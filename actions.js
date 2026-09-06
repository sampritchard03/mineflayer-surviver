import { Vec3 } from "vec3"
import { DigBlock, TossItem } from "./tasks.js";
import pfr from "mineflayer-pathfinder";
const { goals } = pfr

export async function mineBlocks(bot, partialName, count) {
    const initialCount = bot.inventory.getCount(partialName)
    while (bot.inventory.getCount(partialName) < initialCount + count) {
        bot.survival.target = bot.findBlocks({
            matching:(block) => block.displayName.includes(partialName),
            maxDistance:32
        })[0]
        if (!bot.survival.target) break
        bot.survival.mode = "break"
        await bot.survival.performTask(DigBlock(bot))
    }
}

export async function tossItemsTo(bot, partialName, count, username) {
    if (!bot.entities) return
    const testE = Object.values(bot.entities).filter(e => e.username == username)[0]

    if (testE && testE.position) {
        bot.survival.target = testE.position

        bot.survival.mode = "goNear"
        await bot.survival.performTask(TossItem(bot, partialName, count))
    }
}