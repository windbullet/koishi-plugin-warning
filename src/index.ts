import { Context, Schema, h } from 'koishi'

export const name = 'warning'

export const usage = `接收提醒的人需要是机器人的好友  
指令使用方法：  
> 添加提醒关键词 <关键词>  
>> 添加对于该群的提醒关键词  
> 删除提醒关键词 <关键词>  
>> 删除对于该群的提醒关键词  
`

export const inject = ['database']

declare module 'koishi' {
  interface Tables {
    warningData: WarningData;
  }
}

export interface WarningData {
  id: number;
  guildId: string;
  keywords: string[];
}

export interface Config {

  全局提醒关键词:string[];
  超级管理员:string;
  自我触发:boolean;
}

export const Config: Schema<Config> = Schema.object({
  全局提醒关键词:Schema.array(Schema.string())
    .description("群聊中有这些词时，会发送提醒"),
  超级管理员:Schema.string()
    .description("接收提醒以及管理群聊关键词的人的ID"),
  自我触发:Schema.boolean()
    .description("超级管理员触发关键词时是否提醒")
    .default(false)
})

export function apply(ctx: Context, config: Config) {
  extendTable(ctx)
  ctx.guild().middleware(async (session, next) => {
    const data = await ctx.database.get('warningData', { guildId: session.event.channel.id })
    let result = []
    for (let i of (data.length === 0 ? config.全局提醒关键词 : config.全局提醒关键词.concat(data[0].keywords))) {
      if (new RegExp(`${i}`).test(session.content) && (config.自我触发 ? true : session.event.user.id !== config.超级管理员)) {
        result.push(i)
      }
    }
    if (result.length > 0) {
    const channel = await session.bot.createDirectChannel(config.超级管理员)
    await session.bot.sendMessage(channel.id, `
【WARNING】
触发关键词：${result.join(", ")}
触发群聊：${session.event.channel.name}(${session.event.guild.id})
触发用户：${session.username}(${session.event.user.id})
消息内容：${session.content}`)
    }
    return next()
    
  }), true

  ctx.guild().command("warning.添加关键词 <keyword:string>")
    .alias("添加提醒关键词")
    .usage("添加针对该群的提醒关键词")
    .example("添加提醒关键词 Koishi")
    .action(async ({session}, keyword) => {
      if (session.event.user.id === config.超级管理员) {
        if (config.全局提醒关键词.includes(keyword)) return h("quote", session.event.message.id) + "该关键词已存在于全局提醒关键词"
        const data = await ctx.database.get('warningData', { guildId: session.event.channel.id })
        if (data.length === 0) {
          await ctx.database.create('warningData', { guildId: session.event.channel.id, keywords: [keyword] })
          return h("quote", session.event.message.id) + "添加成功"
        }
        if (data[0].keywords.includes(keyword)) return "该关键词已存在"
        data[0].keywords.push(keyword)
        await ctx.database.set('warningData', { guildId: session.event.channel.id }, { keywords: data[0].keywords })
        return h("quote", session.event.message.id) + "添加成功"
      }
      return h("quote", session.event.message.id) + "你没有权限"
      
    })

  ctx.guild().command("warning.删除关键词 <keyword:string>")
    .alias("删除提醒关键词")
    .usage("删除针对该群的提醒关键词")
    .example("删除提醒关键词 Koishi")
    .action(async ({session}, keyword) => {
      if (session.event.user.id === config.超级管理员) {
        const data = await ctx.database.get('warningData', { guildId: session.event.channel.id })
        if (data.length === 0 || !data[0]?.keywords.includes(keyword)) return h("quote", session.event.message.id) + "本群无该提醒关键词"
        await ctx.database.set('warningData', { guildId: session.event.channel.id }, { keywords: data[0].keywords.splice(data[0].keywords.indexOf(keyword), 1) })
        return h("quote", session.event.message.id) + "删除成功"
      }
      return h("quote", session.event.message.id) + "你没有权限"
    })
}

async function extendTable(ctx) {
  await ctx.model.extend('warningData', {
    id: "unsigned",
    guildId: "string",
    keywords: "list"
  }, {primary: 'id', autoInc: true})
}