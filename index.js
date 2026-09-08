import { surviver } from "./surviver.js"
import { mineBlocks, tossItemsTo, goTo, setTargetToEntity, resetTarget } from "./actions.js";

export const actions = {
    mineBlocks,
    tossItemsTo,
    goTo,
    setTargetToEntity,
    resetTarget
}

export const plugin = surviver