import { world, system, EntityComponentTypes, EntityEquippableComponent, EquipmentSlot, Player, Block } from "@minecraft/server";

system.runInterval(() => {
  const players = world.getPlayers();
  for (const player of players) {
    const equipComp = player.getComponent(EntityComponentTypes.Equippable) as EntityEquippableComponent;
    const mainHandItem = equipComp.getEquipment(EquipmentSlot.Mainhand);

    if (mainHandItem && mainHandItem.typeId === "minecraft:torch") {
      updateLightBlock(player, 10);
    } else {
      clearExistingLight(player);
    }
  }
}, 1);

function updateLightBlock(entity: Player, lightLvl: number): void {
  const currentPosition = `${Math.floor(entity.location.x)} ${Math.floor(entity.location.y)} ${Math.floor(entity.location.z)}`;
  const lastPosition = entity.getDynamicProperty("lastLightLocation") as string | undefined;

  if (lastPosition !== currentPosition) {
    if (lastPosition) {
      clearLightBlock(entity, lastPosition);
    }
    const adjustedLocation = findSuitableLocation(entity, currentPosition);
    placeLightBlock(entity, adjustedLocation, lightLvl);
    entity.setDynamicProperty("lastLightLocation", adjustedLocation);
  } else if (!lastPosition) {
    const adjustedLocation = findSuitableLocation(entity, currentPosition);
    placeLightBlock(entity, adjustedLocation, lightLvl);
    entity.setDynamicProperty("lastLightLocation", adjustedLocation);
  }
}

function findSuitableLocation(entity: Player, currentLocation: string): string {
  let [x, y, z] = currentLocation.split(" ").map(Number);
  const offsets: [number, number, number][] = [
    [0, 1, 0],
    [1, 0, 0],
    [-1, 0, 0],
    [0, 0, 1],
    [0, 0, -1],
    [0, -1, 0]
  ];

  for (const offset of offsets) {
    const nx = x + offset[0], ny = y + offset[1], nz = z + offset[2];
    const block = entity.dimension.getBlock({ x: nx, y: ny, z: nz });
    if (isSuitableForLight(block)) {
      return `${nx} ${ny} ${nz}`;
    }
  }
  return currentLocation;
}

function isSuitableForLight(block: Block | undefined): boolean {
  return !!block && (
    block.permutation.matches("minecraft:air") ||
    block.permutation.matches("minecraft:water") ||
    block.permutation.matches("minecraft:flowing_water")
  );
}

function placeLightBlock(entity: Player, location: string, lightLvl: number): void {
  const [x, y, z] = location.split(" ").map(Number);
  const commands = [
    `fill ${x} ${y} ${z} ${x} ${y} ${z} light_block [\"block_light_level\" = ${lightLvl}] replace air`,
    `fill ${x} ${y} ${z} ${x} ${y} ${z} light_block [\"block_light_level\" = ${lightLvl}] replace water`,
    `fill ${x} ${y} ${z} ${x} ${y} ${z} light_block [\"block_light_level\" = ${lightLvl}] replace flowing_water`
  ];

  for (const command of commands) {
    try {
      entity.runCommand(command);
    } catch (e) {
      console.error(`Failed to execute command: ${command}`, e);
    }
  }
}

function clearLightBlock(entity: Player, location: string): void {
  const [x, y, z] = location.split(" ").map(Number);
  try {
    entity.runCommand(
      `fill ${x} ${y} ${z} ${x} ${y} ${z} air replace light_block`
    );
  } catch (e) {
    console.error(`Failed to clear light block at location: ${location}`, e);
  }
}

function clearExistingLight(entity: Player): void {
  const lastLocation = entity.getDynamicProperty("lastLightLocation") as string | undefined;
  if (lastLocation) {
    clearLightBlock(entity, lastLocation);
    entity.setDynamicProperty("lastLightLocation", undefined);
  }
}