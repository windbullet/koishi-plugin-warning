import { Context, Schema } from 'koishi'

export const name = 'warning'

export const usage = "接收提醒的人需要是机器人的好友"

export interface Config {
  提醒关键词:string[];
  接收提醒的人:string;
  自我触发:boolean;
}

export const Config: Schema<Config> = Schema.object({
  提醒关键词:Schema.array(Schema.string())
    .description("群聊中有这些词时，会发送提醒"),
  接收提醒的人:Schema.string()
    .description("接收提醒的人的ID"),
  自我触发:Schema.boolean()
    .description("接收人触发关键词时是否提醒")
    .default(false)
})

export function apply(ctx: Context, config: Config) {
  ctx.guild().middleware(async (session, next) => {
    for (let i of config.提醒关键词) {
      if (new RegExp(`${i}`).test(session.content) && (config.自我触发 ? true : session.event.user.id !== config.接收提醒的人)) {
        await session.bot.sendPrivateMessage(config.接收提醒的人, `群聊：${session.event.channel.id}\n用户：${session.event.user.id}\n消息内容：${session.content}`)
      } else {
        return next()
      }
    }
    
  }), true
}
