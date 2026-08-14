# Design Philosophy

AI agents cannot design. They can execute a design with extraordinary precision, but they cannot originate one. A transformer model produces the weighted average of its training data. Ask it for a landing page and it builds what every landing page it has seen looked like: 16px body, 4px base, Inter, Tailwind defaults, the consensus of a million sites. It will be competent. It will be indistinguishable. It will have no point of view, because a point of view is not something you arrive at by averaging.

Taste is not a skill an agent will develop with more parameters or better training. It is a human capacity: the ability to look at two options that both work and choose the one that means something. To decide that this project needs tight tracking and a serif not because the data supports it, but because of something the designer understood about the brand that no corpus contains. A transformer cannot want something. A designer can.

Rafters exists to hold the designer's wants in a form an agent can execute. Not a rulebook the agent memorizes. A container for taste: the decisions an agent cannot make but can follow with perfect fidelity. The designer fills it with judgment. The agent builds from it with precision. Neither can do the other's job. A system that pretends otherwise, that lets agents write tokens or lets designers hand-tune every value, fails both.

The beliefs that shape Rafters come from three traditions. We name them because the principles are easy to state and hard to follow. The work is in what follows.

## Craft

Good design is honest. We take that literally. A token that stamps `progressionSystem: minor-third` on its metadata while computing values as `base * N` is not honest. It is a system lying about its own architecture. That lie survived two years in this codebase, behind 85 green tests, because the tests asserted what the code did rather than what it claimed.

Honesty in a design system is structural. When spacing says it derives from a ratio, the emitted CSS contains `calc(var(--spacing-base) * ratio^n)`, not a literal that happens to equal the same number today. When radius says it cascades from spacing, the custom property references the spacing variable, and changing the spacing base moves every radius value at runtime. The relationship is the product, not the number. A number is a snapshot. A relationship is a design decision that survives the next change.

Simplicity means digging through the depth of the complexity. Two numbers control every measurement in Rafters: a base and a ratio. That is simple. Making it actually work took thousands of hours: rounding multipliers instead of pixels so token names stay integers, dropping colliding positions instead of shipping duplicates, anchoring shadow geometry to the same progression that drives spacing. The simplicity is real because the complexity underneath it is resolved, not hidden.

Good design is as little design as possible. A designer working in Rafters sets a base, a ratio, a few color hues, and a handful of typography compositions. Everything else generates. They never pick eleven color stops. They never hand-tune twenty spacing values. They never enumerate fourteen typography roles and hope an engineer keeps them current. Rafters does the arithmetic. The designer does the thinking.

## Experimentation

Rules and creativity are not opposites. Rules create the space; creativity fills it. A design system without that principle is a factory stamp.

In Rafters, the designer names things. The token system has never heard of "hero" or "editorial" or "swtor-container-empire." Those are the designer's words, authored in their tool, resolved by the system into whatever CSS properties they chose. Rafters provides ingredient scales: sizes from a progression, weights from a bounded set, families from a role vocabulary. The designer composes from those ingredients, names the result, and Rafters mints a utility. One utility definition serves every composition the designer will ever create, because the mechanism does not know the vocabulary. The vocabulary is the designer's.

The structure is the progression, the ingredient scales, the cascade rules. The chaos, the personality, the voice, the thing that makes one project feel different from another, is what the designer brings. Components should feel alive, not stamped from a factory. Rafters provides the grammar; each project speaks with its own voice.

## Usability

Usability heuristics are empirical, not aesthetic. They describe how humans actually process information, and a system that violates them is not making a style choice. It is making a mistake.

Every component in Rafters carries a cognitive load score. Not because scores are fashionable, but because an unsupervised agent will stack three disclosure patterns in one viewport if nothing tells it the user cannot process that. The do-and-never guidance on every token is the same mechanism. An agent is competent. Competence without constraints produces the internet's average: a hundred sites that all chose the same dropdown for the same reason, because the model saw it work elsewhere. Constraints without intelligence produce a system nobody can use. Both, together, produce an agent that builds what the designer planned.

Recognition rather than recall. The MCP layer hands the agent the designer's decisions, not the system's internals: minor-third spacing with a 4px base, heading font Playfair Display, motion restrained. Not a dump of 240 tokens the agent has to sort out for itself.

Error prevention. No agent writes tokens. That is a permanent ruling. An agent that can write tokens can overwrite a designer's intent, and there is no version of that which preserves the designer's authority over their own project. Rafters prevents the error by not offering the capability.

## The Balance

These three traditions create tension, and the tension is the point.

Craft without experimentation is sterile. A system so resolved that nothing in it surprises anyone is a system that produces polished, forgettable work. Experimentation without craft is noise. Personality not built on real relationships, real cascades, real progressions, real derivations, is decoration wearing a costume. And usability without either is a checkbox. Accessible but soulless. Functional but flat.

Not "accessible but ugly." Not "beautiful but confusing." Not "functional but forgettable."

Rafters has to be all three, together. Every decision in it should be traceable to one of these traditions, and the best decisions answer to more than one. Motion that responds to user input (craft: honest feedback) within perceptual bounds (usability: the visual system sets the constraint) with room for the designer to choose restrained or energetic (experimentation: the personality is theirs). That is one decision touching all three. That is what we are building.

## What This Means in Practice

Rafters generates from constrained inputs. The designer composes from what Rafters generates. Agents consume what the designer composed. Each layer has authority over its own domain and cannot reach into the others.

Rafters' constraints come from thousands of hours of research: measured perceptual bands for motion, field studies of spacing density across thirty sites, the lattice structure that explains why division-closed values dominate real-world spacing, the minor-third ratio that produces steps large enough to create hierarchy and small enough to maintain cohesion. These are not defaults. They are findings.

The designer's compositions come from taste, context, and brand. Rafters cannot generate brand. It can generate the ingredients a brand is composed from, and it can enforce that those ingredients stay coherent when the brand evolves. A designer who changes the spacing base from 4px to 6px does not need to audit fifty components. The cascade carries the consequence.

And agents get the finished result: a project with opinions, intelligence metadata that explains those opinions, and constraints that prevent the opinions from being silently overwritten. An agent building with Rafters is not building from its priors. It is building from the designer's decisions, mediated by Rafters, which earned its opinions through study rather than inheriting them from convention.

That is the thesis. Harmony is not accident. Discord is not error. Both are designed, and a system that captures both lets a hundred agents build a hundred things that all belong to the same designer rather than to the same training data.
