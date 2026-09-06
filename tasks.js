import pfr from "mineflayer-pathfinder";
const { goals } = pfr

export function DigBlock(bot) {
    return () => {
        const t = bot.survival.target.clone()
        var resolve, reject
        const promise = new Promise((res, rej) => {
            resolve = res; reject = rej;
            (async () => {
                try {

                    const block = bot.blockAt(t)
                    if (!block || block.type === 0) {
                        res()
                        return
                    }

                    const tool = bot.pathfinder.bestHarvestTool(block)
                    if (tool != null) await bot.equip(tool)
                    await bot.dig(block)
                    res()
                } catch (err) {
                    rej("Cancelled while digging")
                }
            })()
        })
        return [promise, resolve, reject]
    }
}

export function TossItem(bot, partialName) {
    return () => {
        var resolve, reject
        const promise = new Promise((res, rej) => {
            resolve = res; reject = rej;
            (async () => {
                try {
                    const t = bot.survival.target
                    await bot.pathfinder.goto(new goals.GoalNear(t.x, t.y, t.z, 3))
                    await bot.lookAt(t.offset(0, 1.6, 0))
                    for (let item of bot.inventory.items()) {
                        if (item.displayName.includes(partialName)) {
                            await bot.tossStack(item)
                        }
                        res()
                    }
                } catch(e) {rej(e)}
            })()
        })
        return [promise, resolve, reject]
    }
}