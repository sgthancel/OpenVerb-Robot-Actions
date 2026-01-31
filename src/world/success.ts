// OpenVerb Robot Actions - Success Criteria Evaluator
import type { WorldState } from "./model";
import type { SuccessCriteria } from "./tasks";

export function evaluateSuccess(
  world: WorldState,
  criteria: SuccessCriteria[]
): { success: boolean; details: { criterion: SuccessCriteria; met: boolean; reason?: string }[] } {
  const details: { criterion: SuccessCriteria; met: boolean; reason?: string }[] = [];

  for (const criterion of criteria) {
    let met = false;
    let reason = "";

    switch (criterion.type) {
      case "entity_on_target": {
        const target = world.entities[criterion.targetId];
        if (!target) {
          reason = `Target ${criterion.targetId} not found`;
          break;
        }

        // Check if any entity of the type is contained in the target
        const entitiesOfType = Object.values(world.entities).filter(
          (e) => e.type === criterion.entityType
        );
        met = entitiesOfType.some((e) => target.contains?.includes(e.id));
        if (!met) {
          reason = `No ${criterion.entityType} found on ${target.name}`;
        }
        break;
      }

      case "all_of_type_in_container": {
        const entitiesOfType = Object.values(world.entities).filter(
          (e) => e.type === criterion.entityType
        );
        const containers = Object.values(world.entities).filter(
          (e) => e.type === criterion.containerType && e.container
        );

        if (entitiesOfType.length === 0) {
          met = true; // No entities of type = success
          break;
        }

        const allInContainers = entitiesOfType.every((entity) =>
          containers.some((c) => c.contains?.includes(entity.id))
        );
        met = allInContainers;
        if (!met) {
          const count = entitiesOfType.filter((entity) =>
            containers.some((c) => c.contains?.includes(entity.id))
          ).length;
          reason = `${count}/${entitiesOfType.length} ${criterion.entityType}(s) in ${criterion.containerType}`;
        }
        break;
      }

      case "all_lights_state": {
        const lights = Object.values(world.entities).filter(
          (e) => e.type === "light"
        );
        met = lights.every((light) => light.isOn === criterion.state);
        if (!met) {
          const wrongState = lights.filter(
            (light) => light.isOn !== criterion.state
          );
          reason = `${wrongState.length} light(s) still ${criterion.state ? "off" : "on"}`;
        }
        break;
      }

      case "entity_state": {
        const entitiesOfType = Object.values(world.entities).filter(
          (e) => e.type === criterion.entityType
        );

        met = entitiesOfType.every((entity) => {
          if (criterion.state.isDirty !== undefined && entity.isDirty !== criterion.state.isDirty) {
            return false;
          }
          if (criterion.state.isOn !== undefined && entity.isOn !== criterion.state.isOn) {
            return false;
          }
          if (criterion.state.isOpen !== undefined && entity.isOpen !== criterion.state.isOpen) {
            return false;
          }
          return true;
        });

        if (!met) {
          reason = `Not all ${criterion.entityType}(s) match the required state`;
        }
        break;
      }

      case "report_only":
        // This is always considered met - it's for pilot to report
        met = true;
        reason = criterion.note;
        break;
    }

    details.push({ criterion, met, reason });
  }

  return {
    success: details.every((d) => d.met),
    details,
  };
}
