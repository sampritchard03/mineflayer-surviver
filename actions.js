import { Vec3 } from "vec3"
import { DigBlock, EmptyTask, TossItem } from "./tasks.js";
import pfr from "mineflayer-pathfinder";
const { goals } = pfr

export async function mineBlocks(bot, partialName, count) {
    const initialCount = bot.inventory.getCount(partialName)
    while (bot.inventory.getCount(partialName) < initialCount + count) {
        const t = bot.findBlocks({
            matching:(block) => block.displayName.includes(partialName),
            maxDistance:32
        })[0]
        if (!t) return
        bot.survival.target = t
        bot.survival.mode = "break"
        await bot.survival.performTask(DigBlock(bot))
    }
}

export async function goTo(bot, x, y, z) {
    bot.survival.target = new Vec3(x, y, z)
    await bot.survival.awaitTarget()
}

export function setTargetToEntity(bot, entityName) {
    const entity = Object.values(bot.entities).filter(e => e.username == entityName || e.displayName == entityName)[0]
    if (entity && entity.position) {
        bot.survival.persistantTarget = entity.position
        bot.survival.target = bot.survival.persistantTarget
    }
}

export function resetTarget(bot) {
    bot.survival.persistantTarget = bot.entity.position
    bot.survival.target = bot.survival.persistantTarget
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