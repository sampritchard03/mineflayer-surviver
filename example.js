import mineflayer from "mineflayer"
import {plugin as surviver, actions} from "./index.js"

const bot = mineflayer.createBot({
    username:"Bot",
    version:"1.21.11"
})

bot.once("spawn", () => {
    bot.loadPlugin(surviver)

    bot.on("chat", async (username, msg) => {
        if (username == bot.username) return

        bot.chat("starting")
        await actions.goTo(bot, -140, 64, 286)
        bot.chat("HI")
        await actions.mineBlocks(bot, "Log", 5)
        await actions.tossItemsTo(bot, "Log", 5, username)
        bot.chat("Following")
        actions.setTargetToEntity(bot, username)
    })
})