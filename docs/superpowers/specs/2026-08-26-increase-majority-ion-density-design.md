# Majority Ion Density Design

## Goal

Make the resting concentration gradient easier to see by showing more Na⁺ outside the membrane and more K⁺ inside the membrane, without crowding the compact phone layout or changing the established animation behavior.

## Chosen approach

Use a modest fixed increase in the majority-ion background populations:

- Na⁺: 9 outside and 2 inside at rest.
- K⁺: 2 outside and 8 inside at rest.
- Keep the existing transfer amount of three ions during the relevant action-potential phases.
- Preserve the total visible count for each ion while particles transfer between compartments.

This is preferred over a large density increase because the 320 × 568 layout has limited vertical space. It is also preferred over shrinking every ion because the current outlined particles remain legible and visually consistent.

## Visual distribution

Add two Na⁺ coordinates to the extracellular compartment and two K⁺ coordinates to the intracellular compartment. Place the new coordinates between existing rows, away from the central channel paths and compartment labels. The new coordinates should be last in their arrays so that, when particles transfer, those extra majority-side particles are the first to disappear and the redistribution reads naturally.

## Behavior and constraints

- Background ions continue their existing continuous motion.
- Crossing ions continue to animate through the corresponding open channel.
- Minority ions remain visible: 2 Na⁺ inside and 2 K⁺ outside at rest.
- Sodium total remains 11 throughout the simulation.
- Potassium total remains 10 throughout the simulation.
- No new text, controls, routes, or dependencies.
- Both original and beautified routes inherit the same biologically consistent counts.
- The 320 × 568 beautified layout must remain free of document overflow and panel overlap.

## Verification

- Unit tests assert exact resting counts and conserved totals during Na⁺ and K⁺ transfer.
- Browser regression tests count rendered particles at desktop and phone widths.
- Existing responsive, animation, phospholipid, build, lint, and browser suites remain green.
