import pfr from "mineflayer-pathfinder"
const { goals, pathfinder, Movements } = pfr
import { loader as autoEat } from "mineflayer-auto-eat"
import { Vec3 } from "vec3"

export const surviver = async (bot) => {
    bot.loadPlugin(pathfinder)
    bot.loadPlugin(autoEat)

    function localPos(wP) {
        return bot.entity ? wP.minus(bot.entity.position.clone()) : null
    }

    function worldPos(lP) {
        return bot.entity ? lP.plus(bot.entity.position.clone()) : null
    }

    function itemTier(o) {
        if (o == null) return 0
        const {displayName} = o
        if (displayName.includes("Netherite")) return 5
        if (displayName.includes("Diamond")) return 4
        if (displayName.includes("Iron")) return 3
        if (displayName.includes("Stone")) return 2
        if (displayName.includes("Gold")) return 1
        return 0
    }

    function swingTime(o) {
        if (o == null) return 5
        const {displayName} = o
        if (displayName.includes("Sword")) return 12
        if (displayName.includes("Axe")) return 20
        return 5
    }

    function tool (partialName) {
        var bestItem = null;
        var bestTier = 0;
        //0:wood/leather, 1:gold, 2:stone/chainmail, 3:iron, 4:diamond, 5:netherite
        for (let item of bot.inventory.items()) {
            if (item.displayName.includes(partialName)) {
            const tier = itemTier(item)
                if (tier > bestTier) {
                    bestItem = item
                    bestTier = tier
                }
            }
        }

        return bestItem
    }

    bot.inventory.getCount = (partialName) => {
        var count = 0;
        for (let item of bot.inventory.items())
            if (item.displayName.includes(partialName))
                count += item.count
        return count
    }

    bot.inventory.weapon = () => tool("Sword")
    bot.inventory.axe = () => tool("Axe")
    bot.inventory.shovel = () => tool("Shovel")
    bot.inventory.pickaxe = () => tool("Pickaxe")

    var closestItemPos
    var freshTick = false
    var enemyCount = 0
    var resolveSetIdle = () => {}
    var cancelIdlePromise = () => {}
    var idlePromise = async () => {}

    bot.survival = {
        persistantTarget: bot.entity.position,
        target: bot.entity.position,
        mode: 'break',
        nucleus: new Vec3(0, 0, 0),
        targRange: 1,
        nucRange: 10,
        focus: 0.1,
        dontGatherTimer: 0,
        setIdlePromise: (action, cb=()=>{}) => {
            cancelIdlePromise()
            cancelIdlePromise = () => {}
            idlePromise = action
            resolveSetIdle = cb
        },
        performTask: (action) => new Promise((res => {
            bot.survival.setIdlePromise(action, res)
        })),
        stopTask: () => {
            cancelIdlePromise()
            cancelIdlePromise = () => {}
            idlePromise = async () => {}
            resolveSetIdle = () => {}
            bot.survival.target = bot.survival.persistantTarget
            bot.pathfinder.stop()
        },
        setPersistantTarget: (target) => {
            bot.survival.persistantTarget = target
            bot.survival.target = bot.survival.persistantTarget
        }
    }

    bot.survival.target = bot.survival.persistantTarget

    

    function distanceXZ (dx, dz) {
        dx = Math.abs(dx)
        dz = Math.abs(dz)
        return Math.abs(dx - dz) + Math.min(dx, dz) * Math.SQRT2
    }

    class GoalAvoidMobs extends goals.Goal {
        constructor () {
            super()
        }

        heuristic (node) {

            var dx1, dy1, dz1, d1

            if (closestItemPos) {
                dx1 = closestItemPos.x - node.x
                dy1 = closestItemPos.y - node.y
                dz1 = closestItemPos.z - node.z

                d1 = distanceXZ(dx1, dz1) + Math.abs(dy1)
            } else {
                if (bot.survival.mode == "break") {
                    dx1 = node.x - bot.survival.target.x
                    dy1 = node.y - bot.survival.target.y
                    dz1 = node.z - bot.survival.target.z
                    d1 = distanceXZ(dx1, dz1) + Math.abs(dy1 < 0 ? dy1 + 1 : dy1)
                } else {
                    dx1 = bot.survival.target.x - node.x
                    dy1 = bot.survival.target.y - node.y
                    dz1 = bot.survival.target.z - node.z

                    d1 = distanceXZ(dx1, dz1) + Math.abs(dy1)
                }
            }

            if (enemyCount === 0) 
                return d1

            const dx = bot.survival.nucleus.x - node.x
            const dy = bot.survival.nucleus.y - node.y
            const dz = bot.survival.nucleus.z - node.z

            const d = distanceXZ(dx, dz) + Math.abs(dy)

            return -d + bot.survival.focus * d1
        }

        isEnd (node) {

            var ret = true;

            if (enemyCount != 0) {
                const dx = bot.survival.nucleus.x - node.x
                const dy = bot.survival.nucleus.y - node.y
                const dz = bot.survival.nucleus.z - node.z

                ret = ret && !(dx * dx + dy * dy + dz * dz <= bot.survival.nucRange * bot.survival.nucRange)
            }
            
            if (closestItemPos) {
                const dx2 = closestItemPos.x - node.x
                const dy2 = closestItemPos.y - node.y
                const dz2 = closestItemPos.z - node.z

                return ret && (dx2 * dx2 + dy2 * dy2 + dz2 * dz2) <= 1
            } else {

                if (bot.survival.mode == "goNear") {

                    const dx1 = bot.survival.target.x - node.x
                    const dy1 = bot.survival.target.y - node.y
                    const dz1 = bot.survival.target.z - node.z

                    return ret && (dx1 * dx1 + dy1 * dy1 + dz1 * dz1) <= bot.survival.targRange * bot.survival.targRange
                }

                if (bot.survival.mode != "break") return ret

                if (
                    node.distanceTo(bot.survival.target.offset(0, 1.6, 0)) > bot.survival.targRange
                ) return false
                // Check faces that could be seen from the current position. If the delta is smaller then 0.5 that means the bot cam most likely not see the face as the block is 1 block thick
                // this could be false for blocks that have a smaller bounding box then 1x1x1
                const dx1 = node.x - (bot.survival.target.x + 0.5)
                const dy1 = node.y + 1.6 - (bot.survival.target.y + 0.5) // -0.5 because the bot position is calculated from the block position that is inside its feet so 0.5 - 1 = -0.5
                const dz1 = node.z - (bot.survival.target.z + 0.5)
                // Check y first then x and z
                const visibleFaces = {
                y: Math.sign(Math.abs(dy1) > 0.5 ? dy1 : 0),
                x: Math.sign(Math.abs(dx1) > 0.5 ? dx1 : 0),
                z: Math.sign(Math.abs(dz1) > 0.5 ? dz1 : 0)
                }
                const validFaces = []
                for (const i in visibleFaces) {
                    if (!visibleFaces[i]) {
                        // skip as this face is not visible
                        continue
                    }
                    const targetPos = new Vec3(bot.survival.target.x, bot.survival.target.y, bot.survival.target.z).offset(0.5 + (i === 'x' ? visibleFaces[i] * 0.5 : 0), 0.5 + (i === 'y' ? visibleFaces[i] * 0.5 : 0), 0.5 + (i === 'z' ? visibleFaces[i] * 0.5 : 0))
                    const startPos = new Vec3(node.x + 0.5, node.y + 1.6, node.z + 0.5)
                    const rayPos = bot.world.raycast(startPos, targetPos.clone().subtract(startPos).normalize(), bot.survival.targRange)?.position
                    if (rayPos && rayPos.x === bot.survival.target.x && rayPos.y === bot.survival.target.y && rayPos.z === bot.survival.target.z) {
                        validFaces.push({
                            face: rayPos.face,
                            targetPos
                        })
                    }
                }
                return ret && validFaces.length !== 0
            }
        }

        hasChanged () {
            if (freshTick) {
                freshTick = false
                return !bot.pathfinder.isMining()
            }
            return false
        }

        isValid () {
            return true
        }
    }

    const movements = new Movements(bot)
    movements.allowSprinting = true;
    bot.pathfinder.setMovements(movements)

    bot.physics.pitchSpeed = 6000
    bot.physics.yawSpeed = 6000

    bot.autoEat.enableAuto()

    var t = 0
    var stuckTime = 0

    bot.on("entityHurt", entity => {
        if (entity == bot.entity) bot.survival.nucRange = 10
    })

    bot.on("physicsTick", () => {

        var x = 0;
        var y = 0;
        var z = 0;
        var count = 0
        enemyCount = 0
        bot.survival.nucRange = bot.health < 10 || bot.food < 6 ? 10 : Math.min(0, bot.survival.nucRange - 4)*0.99 + 4

        function addPos(pos) {
            const d = pos.distanceTo(bot.entity.position)
            const p = localPos(pos)
            const mul = Math.max(0, bot.survival.nucRange - d)

            if (mul > 0) enemyCount++

            x += p.x * mul
            y += p.y * mul
            z += p.z * mul

            count += mul
        }

        var closestEntity = null
        var closestDist = Infinity

        closestItemPos = undefined;
        var closestItemDist = 16

        for (let entity of Object.values(bot.entities)) {

            if (bot.survival.dontGatherTimer <= 0 && entity.getDroppedItem() != null) {
                const dist = entity.position.distanceTo(bot.entity.position)
                if (dist < closestItemDist) {
                    closestItemPos = entity.position
                    closestItemDist = dist
                }
            }

            else if (
                entity.kind === "Hostile mobs" ||
                entity.kind === "Projectiles"
            ) {
                const d = entity.position.distanceTo(bot.entity.position)
                if (entity.kind != "Projectiles" && d < closestDist) {
                    closestEntity = entity
                    closestDist = d
                }
                const p = entity.position.plus(entity.velocity)
                if (entity.name === "creeper") {
                    const isGettingReadyToExplode = entity.metadata[16] != undefined

                    if (isGettingReadyToExplode) {
                        bot.survival.nucRange = 10
                        addPos(p) // add more weight to the creeper so we run from it in more scenarios
                        addPos(p)
                        addPos(p)
                        addPos(p)
                    }
                }
                addPos(p)
            }
        }

        if (enemyCount > 0) {

            const weapon = bot.inventory.weapon()

            if (t % swingTime(weapon) == 0 && closestDist <= 4) {
                if (weapon != null) bot.equip(weapon)
                bot.attack(closestEntity)
            }

            x /= count
            y /= count
            z /= count

            const p = worldPos(new Vec3(x, y, z)).floored()
            bot.survival.nucleus.set(p.x, p.y, p.z)

            const nucleusDirection = bot.survival.nucleus.minus(bot.entity.position)
            const targetDirection = bot.survival.target.minus(bot.entity.position)
            const nucleusLength = nucleusDirection.distanceTo(new Vec3(0, 0, 0))
            const targetLength = targetDirection.distanceTo(new Vec3(0, 0, 0))

            if (nucleusLength > 0 && targetLength > 0) {
                const cosine = Math.max(-1, Math.min(1,
                    nucleusDirection.dot(targetDirection) / (nucleusLength * targetLength)
                ))
                const angle = Math.acos(cosine)
                const angleFocus = 0.1 + (angle / Math.PI) * 1.9
                const distanceFactor = Math.max(0, Math.min(1, nucleusLength / bot.survival.nucRange))
                bot.survival.focus = 0.1 + (angleFocus - 0.1) * distanceFactor
            } else {
                bot.survival.focus = 0.1
            }

            cancelIdlePromise()
        }

        if (bot.entity.velocity.distanceTo(new Vec3(0, 0, 0)) < 0.2) {
            if (stuckTime > 10 && !bot.pathfinder.isMining()) {
                stuckTime = 0
                bot.pathfinder.stop()
            } else {
                stuckTime++
            } 
        } else {
            stuckTime = 0
        }

        bot.survival.dontGatherTimer--
        freshTick = true
        t++
    })

    const timeout = (time) => new Promise((res, rej) => {
        setTimeout(res, time)
    })

    while(true) {
        var error = false
        await bot.pathfinder.goto(new GoalAvoidMobs()).catch(e => {error = true; console.error("pfr error")})
        if (error) continue

        error = false
        var promise = idlePromise()
        var res = () => {}, rej = () => {}
        if (promise instanceof Array) {res = promise[1]; rej = promise[2]; promise = promise[0]}
        cancelIdlePromise = () => rej("cancelled")
        await promise.catch(e => {error = true; console.error("idlePromise error: "+e)})
        cancelIdlePromise = () => {}
        if (error) continue

        resolveSetIdle()

        bot.survival.stopTask()
        bot.survival.target = bot.survival.persistantTarget

        await timeout(200)
        
    }
}