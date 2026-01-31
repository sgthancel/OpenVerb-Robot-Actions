// OpenVerb Town - Heuristic Pilot
// Rule-based baseline pilot (not fake; actually thinks)

import type { Pilot, PilotInput, PilotOutput } from "./contract";
import type { ObservationEntity, VerbName } from "@/src/world/model";

function findNearestEntity(
  entities: ObservationEntity[],
  robotPos: { x: number; y: number },
  filter: (e: ObservationEntity) => boolean
): ObservationEntity | null {
  const filtered = entities.filter(filter);
  if (filtered.length === 0) return null;

  return filtered.reduce((nearest, e) => {
    const distE = Math.abs(e.pos.x - robotPos.x) + Math.abs(e.pos.y - robotPos.y);
    const distN = Math.abs(nearest.pos.x - robotPos.x) + Math.abs(nearest.pos.y - robotPos.y);
    return distE < distN ? e : nearest;
  });
}

function getDistance(a: { x: number; y: number }, b: { x: number; y: number }): number {
  return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
}

const INTERACTION_DISTANCE = 2.5;

function isInRange(a: { x: number; y: number }, b: { x: number; y: number }): boolean {
  return getDistance(a, b) <= INTERACTION_DISTANCE;
}

export function createHeuristicPilot(): Pilot {
  return {
    name: "Heuristic Pilot",

    async plan(input: PilotInput): Promise<PilotOutput> {
      const { goal, observation, policySummary } = input;
      const { robot, entities } = observation;
      const goalLower = goal.toLowerCase();

      // Handle policy blocks
      if (policySummary.pendingConfirmation) {
        return {
          type: "ask_user",
          question: `Policy requires confirmation: ${policySummary.pendingConfirmation.reason}. Should I proceed?`,
        };
      }

      const isTrash = goalLower.includes("trash");
      const isPackage = goalLower.includes("package");
      const isSetTable = goalLower.includes("set") && goalLower.includes("table");
      const isOrganize = goalLower.includes("organize") || (goalLower.includes("book") && goalLower.includes("shelf"));
      const isLightsOff = goalLower.includes("lights") && goalLower.includes("off");
      const isCleanSpot = goalLower.includes("dirty spot") || (goalLower.includes("clean") && goalLower.includes("spot"));
      const isNightRoutine = goalLower.includes("night") || goalLower.includes("routine") || goalLower.includes("security");
      const isReactiveCleaning = goalLower.includes("spill") || (goalLower.includes("reactive") && goalLower.includes("clean"));
      const isScanReport = goalLower.includes("scan") || goalLower.includes("report");
      const isBedroomDemo = goalLower.includes("bedroom");

      // === GLOBAL HANDS FULL GUARD ===
      if (robot.carrying) {
        const carried = entities.find((e) => e.id === robot.carrying);

        // Determine if carried item matches the active mission
        let matchesMission = false;
        if (isTrash && carried?.type === "trash") matchesMission = true;
        if (isPackage && carried?.type === "package") matchesMission = true;
        if (isSetTable && (carried?.type === "dish" || carried?.type === "cup")) matchesMission = true;
        if (isOrganize && carried?.type === "book") matchesMission = true;

        if (!matchesMission && (isTrash || isPackage || isSetTable || isOrganize)) {
          const table = findNearestEntity(entities, robot.pos, (e) => e.type === "table");
          if (table) {
            if (!isInRange(robot.pos, table.pos)) {
              return {
                type: "act",
                verb: "world.move_to" as VerbName,
                args: { target: table.pos },
                rationale: `Clearing hands: moving to ${table.name} to drop off unrelated ${carried?.name}`,
              };
            }
            return {
              type: "act",
              verb: "world.place" as VerbName,
              args: { entityId: robot.carrying, destination: { targetId: table.id } },
              rationale: `Clearing hands: placing ${carried?.name} on ${table.name}`,
            };
          }
        }
      }

      // === TRASH CLEANUP ===
      if (isTrash) {
        // If carrying trash, find trash bin and place
        if (robot.carrying) {
          const carriedEntity = entities.find((e) => e.id === robot.carrying);
          if (carriedEntity?.type === "trash") {
            const trashBin = findNearestEntity(entities, robot.pos, (e) => e.type === "trash_bin");
            if (trashBin) {
              if (!isInRange(robot.pos, trashBin.pos)) {
                return {
                  type: "act",
                  verb: "world.move_to" as VerbName,
                  args: { target: trashBin.pos },
                  rationale: "Moving to trash bin",
                };
              }
              return {
                type: "act",
                verb: "world.place" as VerbName,
                args: { entityId: robot.carrying, destination: { targetId: trashBin.id } },
                rationale: "Placing trash in bin",
              };
            }
          }
        }

        // Find trash to pick up
        const trash = findNearestEntity(entities, robot.pos, (e) => e.type === "trash" && e.state.pickable === true);
        if (trash) {
          if (!isInRange(robot.pos, trash.pos)) {
            return {
              type: "act",
              verb: "world.move_to" as VerbName,
              args: { target: trash.pos },
              rationale: `Moving to pick up ${trash.name}`,
            };
          }
          return {
            type: "act",
            verb: "world.pick" as VerbName,
            args: { entityId: trash.id },
            rationale: `Picking up ${trash.name}`,
          };
        }

        // Check if all trash is cleaned
        const remainingTrash = entities.filter((e) => e.type === "trash");
        if (remainingTrash.length === 0) {
          return { type: "done", summary: "All trash has been thrown away." };
        }
      }

      // === SET TABLE / ORGANIZE (GENERIC FETCH & PLACE) ===
      if (isSetTable || isOrganize) {
        const targetType = isSetTable ? (entities.some(e => e.type === "dish" && !e.state.parentId) ? "dish" : "cup") : "book";
        const destinationType = isSetTable ? "table" : "shelf";

        if (robot.carrying) {
          const carried = entities.find(e => e.id === robot.carrying);
          const isTargetItem = isSetTable ? (carried?.type === "dish" || carried?.type === "cup") : (carried?.type === "book");

          if (isTargetItem) {
            const dest = findNearestEntity(entities, robot.pos, e => e.type === destinationType);
            if (dest) {
              if (!isInRange(robot.pos, dest.pos)) {
                return {
                  type: "act",
                  verb: "world.move_to" as VerbName,
                  args: { target: dest.pos },
                  rationale: `Moving to ${dest.name} to place ${carried?.name}`,
                };
              }
              return {
                type: "act",
                verb: "world.place" as VerbName,
                args: { entityId: robot.carrying, destination: { targetId: dest.id } },
                rationale: `Placing ${carried?.name} on ${dest.name}`,
              };
            }
          }
        }

        // Find item to fetch
        const item = findNearestEntity(entities, robot.pos, e => e.type === targetType && !e.state.parentId);
        if (item) {
          if (!isInRange(robot.pos, item.pos)) {
            return {
              type: "act",
              verb: "world.move_to" as VerbName,
              args: { target: item.pos },
              rationale: `Moving to pick up ${item.name}`,
            };
          }
          return {
            type: "act",
            verb: "world.pick" as VerbName,
            args: { entityId: item.id },
            rationale: `Picking up ${item.name}`,
          };
        }

        // Check if done
        const remaining = entities.filter(e => e.type === targetType && !e.state.parentId);
        if (remaining.length === 0) {
          return { type: "done", summary: `Finished ${isSetTable ? "setting table" : "organizing"}.` };
        }
      }

      // === NIGHT ROUTINE ===
      if (isNightRoutine) {
        // First check time if goal mentions night/8pm
        if (observation.ts) {
          const hour = new Date(observation.ts).getHours();
          if (hour < 20 && hour >= 6 && goalLower.includes("8pm")) {
            return { type: "done", summary: `It's only ${hour}:00. Night routine should wait until 8pm.` };
          }
        }

        // 1. Close open doors
        const openDoor = findNearestEntity(entities, robot.pos, e => e.type === "door" && e.state.isOpen === true);
        if (openDoor) {
          if (!isInRange(robot.pos, openDoor.pos)) {
            return { type: "act", verb: "world.move_to" as VerbName, args: { target: openDoor.pos }, rationale: "Moving to close door" };
          }
          return { type: "act", verb: "world.close" as VerbName, args: { entityId: openDoor.id }, rationale: "Closing door" };
        }

        // 2. Porch light on (at night)
        const porchLight = findNearestEntity(entities, robot.pos, e => e.type === "light" && e.name.toLowerCase().includes("porch") && e.state.isOn === false);
        if (porchLight) {
          if (!isInRange(robot.pos, porchLight.pos)) {
            return { type: "act", verb: "world.move_to" as VerbName, args: { target: porchLight.pos }, rationale: "Moving to turn on porch light" };
          }
          return { type: "act", verb: "world.toggle" as VerbName, args: { entityId: porchLight.id, state: true }, rationale: "Turning on porch light" };
        }

        return { type: "done", summary: "Night routine complete: house is secured." };
      }

      // === REACTIVE CLEANING ===
      if (isReactiveCleaning) {
        const dirtySpot = findNearestEntity(entities, robot.pos, e => (e.type === "dirty_spot" || e.name.toLowerCase().includes("spill")) && e.state.isDirty === true);
        if (dirtySpot) {
          if (!isInRange(robot.pos, dirtySpot.pos)) {
            return { type: "act", verb: "world.move_to" as VerbName, args: { target: dirtySpot.pos }, rationale: "Moving to clean mess" };
          }
          return { type: "act", verb: "world.clean" as VerbName, args: { targetId: dirtySpot.id }, rationale: "Cleaning mess" };
        }

        // Use observe to search for spills if none found
        return {
          type: "act",
          verb: "world.observe" as VerbName,
          args: { radius: 20 },
          rationale: "No spills visible. Looking around for messes."
        };
      }

      // === PACKAGE RETRIEVAL ===
      if (isPackage) {
        if (robot.carrying) {
          const carriedEntity = entities.find((e) => e.id === robot.carrying);
          if (carriedEntity?.type === "package") {
            const table = findNearestEntity(entities, robot.pos, (e) => e.type === "table" && e.name.toLowerCase().includes("kitchen"));
            if (table) {
              if (!isInRange(robot.pos, table.pos)) {
                return {
                  type: "act",
                  verb: "world.move_to" as VerbName,
                  args: { target: table.pos },
                  rationale: "Moving to kitchen table",
                };
              }
              return {
                type: "act",
                verb: "world.place" as VerbName,
                args: { entityId: robot.carrying, destination: { targetId: table.id } },
                rationale: "Placing package on kitchen table",
              };
            }
          }
        }

        const pkg = findNearestEntity(entities, robot.pos, (e) => e.type === "package");
        if (pkg) {
          if (!isInRange(robot.pos, pkg.pos)) {
            return {
              type: "act",
              verb: "world.move_to" as VerbName,
              args: { target: pkg.pos },
              rationale: "Moving to package",
            };
          }
          return {
            type: "act",
            verb: "world.pick" as VerbName,
            args: { entityId: pkg.id },
            rationale: "Picking up package",
          };
        }

        return { type: "done", summary: "Package retrieved." };
      }

      // === LIGHTS OFF ===
      if (isLightsOff) {
        const lightOn = findNearestEntity(entities, robot.pos, (e) => e.type === "light" && e.state.isOn === true);
        if (lightOn) {
          if (!isInRange(robot.pos, lightOn.pos)) {
            return {
              type: "act",
              verb: "world.move_to" as VerbName,
              args: { target: lightOn.pos },
              rationale: `Moving to ${lightOn.name}`,
            };
          }
          return {
            type: "act",
            verb: "world.toggle" as VerbName,
            args: { entityId: lightOn.id, state: false },
            rationale: `Turning off ${lightOn.name}`,
          };
        }
        return { type: "done", summary: "All lights have been turned off." };
      }

      // === CLEAN DIRTY SPOT ===
      if (isCleanSpot) {
        const dirtySpot = findNearestEntity(entities, robot.pos, (e) => e.type === "dirty_spot" && e.state.isDirty === true);
        if (dirtySpot) {
          if (!isInRange(robot.pos, dirtySpot.pos)) {
            return {
              type: "act",
              verb: "world.move_to" as VerbName,
              args: { target: dirtySpot.pos },
              rationale: "Moving to dirty spot",
            };
          }
          return {
            type: "act",
            verb: "world.clean" as VerbName,
            args: { targetId: dirtySpot.id },
            rationale: "Cleaning dirty spot",
          };
        }
        return { type: "done", summary: "All spots have been cleaned." };
      }

      // === SCAN/REPORT ===
      if (isScanReport) {
        // 1. Move to the middle of the house if we haven't moved yet
        if (robot.pos.x === 5 && robot.pos.y === 5) {
          return { type: "act", verb: "world.move_to" as VerbName, args: { target: { x: 10, y: 10 } }, rationale: "Moving to scan more of the house" };
        }

        // 2. Perform a high-radius scan
        if (observation.entities.length < 5) {
          return { type: "act", verb: "world.observe" as VerbName, args: { radius: 25 }, rationale: "Scanning surroundings for issues" };
        }

        const outOfPlace = entities.filter((e) => {
          if (e.type === "trash") return true;
          if (e.type === "dirty_spot" && e.state.isDirty) return true;
          return false;
        });

        return {
          type: "done",
          summary: outOfPlace.length > 0
            ? `House scan complete. Found ${outOfPlace.length} issues: ${outOfPlace.map((e) => e.name).join(", ")}`
            : "House scan complete. Everything is in order.",
        };
      }

      // === BEDROOM (policy demo) ===
      if (isBedroomDemo) {
        const bedroomRoom = observation.rooms?.bedroom;
        if (bedroomRoom) {
          const targetX = Math.floor((bedroomRoom.bounds.min.x + bedroomRoom.bounds.max.x) / 2);
          const targetY = Math.floor((bedroomRoom.bounds.min.y + bedroomRoom.bounds.max.y) / 2);

          if (!isInRange(robot.pos, { x: targetX, y: targetY })) {
            return {
              type: "act",
              verb: "world.move_to" as VerbName,
              args: { target: { x: targetX, y: targetY } },
              rationale: "Moving into bedroom area",
            };
          }

          // Once inside, perform an observation
          return {
            type: "act",
            verb: "world.observe" as VerbName,
            args: { radius: 15 },
            rationale: "Observing the bedroom surroundings",
          };
        }
      }

      // Default: observe surroundings
      return {
        type: "act",
        verb: "world.observe" as VerbName,
        args: { radius: 15 },
        rationale: "Observing surroundings to understand current state",
      };
    },
  };
}
