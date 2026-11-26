/**
 * T23: a token registry. The intent is a curated default: every token starts
 * from it, as a value or a rule that makes one, in each mode. A rule is a
 * plain function; the registry records what it reads while it runs, and those
 * reads are the token's dependencies. The one change is set: with a value and
 * a reason it records a designer's choice for one mode and pushes it through
 * everything that reads it; with no value it returns that mode to what the
 * intent makes. A designer can add a font, a colour or a fill by setting a
 * new name. A token keeps one reason per mode, the latest. No node: imports.
 */

/** What a rule sees: read a token (in this mode unless another is named), and which token and mode it is making. */
export interface Ctx {
  get(name: string, mode?: string): unknown;
  readonly mode: string;
  readonly name: string;
}

/** A rule: a plain function from its arguments and what it reads to a value. */
export type Rule = (args: unknown, ctx: Ctx) => unknown;

/** How a token's value is made in one mode: a value, a rule, or the same as another mode. */
export type Def =
  | { readonly value: unknown }
  | { readonly rule: string; readonly args?: unknown }
  | { readonly follows: string };

/**
 * A token as the intent gives it. Its own def is the first mode's; the
 * others follow it: a rule runs again in their mode, a value is read from the
 * first mode. `modes` overrides a mode's def.
 */
export type Seed = {
  readonly name: string;
  readonly axis?: string;
  readonly modes?: Readonly<Record<string, Def>>;
} & ({ readonly value: unknown } | { readonly rule: string; readonly args?: unknown });

/** Makes the tokens of a kind a designer can add (a font, a colour, a fill), or undefined if the name and value are not that kind. */
export type Maker = (name: string, value: unknown) => readonly Seed[] | undefined;

/** A designer's choice for one mode, with the one reason kept for it. */
export interface Choice {
  readonly name: string;
  readonly value: unknown;
  readonly reason: string;
  readonly mode?: string;
}

export class Refused extends Error {
  constructor(
    readonly code:
      | 'no-reason'
      | 'unknown-token'
      | 'unknown-rule'
      | 'cycle'
      | 'rule-failed'
      | 'name-taken'
      | 'in-use'
      | 'law',
    message: string,
  ) {
    super(message);
    this.name = 'Refused';
  }
}

interface Node {
  readonly name: string;
  readonly mode: string;
  def: Def;
  value: unknown;
  reads: ReadonlySet<string>;
  choice?: { readonly value: unknown; readonly reason: string } | undefined;
  /** For a token a designer added: the addition it belongs to; on the added token itself, its kind and what was set. */
  addedBy?: string;
  added?: { readonly kind: string; readonly value: unknown; readonly reason: string };
}

const key = (name: string, mode: string): string => `${name}@${mode}`;

export class Registry {
  private readonly nodes = new Map<string, Node>();
  private readonly readers = new Map<string, Set<string>>();
  private readonly makers: ReadonlyMap<string, Maker>;
  private readonly axisOf = new Map<string, string>();
  /** Each axis and its modes, the first the default: scheme (light, dark), motion (full, reduced). */
  readonly axes: Readonly<Record<string, readonly string[]>>;
  /** Modes the system decides and no designer can choose, such as reduced motion. */
  private readonly law: ReadonlySet<string>;

  /** Makes the registry from the intent, then replays the designer's choices. */
  constructor(
    intent: readonly Seed[],
    private readonly rules: ReadonlyMap<string, Rule>,
    options: {
      axes?: Readonly<Record<string, readonly string[]>>;
      law?: readonly string[];
      makers?: ReadonlyMap<string, Maker>;
      choices?: readonly Choice[];
    } = {},
  ) {
    this.axes = options.axes ?? { scheme: ['light', 'dark'] };
    this.law = new Set(options.law ?? []);
    this.makers = options.makers ?? new Map();
    for (const seed of intent) this.place(seed);
    this.commit(new Set(this.nodes.keys()), new Map());
    for (const c of options.choices ?? [])
      this.set(c.name, c.value, { reason: c.reason, ...(c.mode ? { mode: c.mode } : {}) });
  }

  get(
    name: string,
    mode = this.first(name),
  ):
    | { value: unknown; rule?: { name: string; args?: unknown }; reason?: string; chosen: boolean }
    | undefined {
    const n = this.nodes.get(key(name, mode));
    if (!n) return undefined;
    const reason = n.choice?.reason ?? n.added?.reason;
    return {
      value: n.value,
      ...('rule' in n.def
        ? { rule: { name: n.def.rule, ...(n.def.args !== undefined ? { args: n.def.args } : {}) } }
        : {}),
      ...(reason !== undefined ? { reason } : {}),
      chosen: n.choice !== undefined,
    };
  }

  has(name: string): boolean {
    return this.axisOf.has(name);
  }

  names(): readonly string[] {
    return [...this.axisOf.keys()];
  }

  /** The modes a token has, the first its default. */
  modesOf(name: string): readonly string[] {
    return this.axes[this.axisOf.get(name) ?? ''] ?? [];
  }

  /** What this token read the last time it was made, as name@mode. */
  reads(name: string, mode = this.first(name)): readonly string[] {
    return [...this.node(key(name, mode)).reads];
  }

  /** Every token, as name@mode, a change to this one reaches. */
  reach(name: string, mode = this.first(name)): readonly string[] {
    return [...this.downstream(key(this.node(key(name, mode)).name, mode))];
  }

  /** The designer's choices and additions, one per token and mode: what a host saves. */
  choices(): readonly Choice[] {
    return [...this.nodes.values()].flatMap((n) => {
      if (n.added) return [{ name: n.name, value: n.added.value, reason: n.added.reason }];
      if (!n.choice) return [];
      return [
        {
          name: n.name,
          value: n.choice.value,
          reason: n.choice.reason,
          ...(n.mode !== this.first(n.name) ? { mode: n.mode } : {}),
        },
      ];
    });
  }

  /**
   * The one change. With a value and a reason: a choice for one mode (the
   * first unless named), or on a new name a font, colour or fill to add.
   * With no value: that mode returns to what the intent makes; an addition
   * is removed unless something reads it.
   */
  set(
    name: string,
    value?: unknown,
    options?: { reason: string; mode?: string },
  ): readonly string[] {
    const reason = options?.reason ?? '';
    if (value !== undefined && reason.trim() === '')
      throw new Refused('no-reason', 'a change needs a reason');
    if (!this.has(name) && value !== undefined) return this.add(name, value, reason);
    const mode = options?.mode ?? this.first(name);
    if (this.law.has(mode))
      throw new Refused('law', `${mode} is law; no designer choice overrides it`);
    const n = this.node(key(name, mode));
    if (value === undefined) {
      if (n.added) return this.remove(name);
      if (!n.choice) return [];
      const choice = n.choice;
      n.choice = undefined;
      try {
        return this.commit(new Set([key(name, mode)]), new Map());
      } catch (e) {
        n.choice = choice;
        throw e;
      }
    }
    if (n.added) {
      const seed = this.makers
        .get(n.added.kind)?.(name, value)
        ?.find((s) => s.name === name);
      if (!seed) throw new Refused('unknown-token', `"${name}" cannot take that value`);
      const before = n.def;
      n.def = ownDef(seed);
      try {
        const touched = this.commit(new Set([key(name, mode)]), new Map());
        n.added = { kind: n.added.kind, value, reason };
        return touched;
      } catch (e) {
        n.def = before;
        throw e;
      }
    }
    const touched = this.commit(new Set([key(name, mode)]), new Map([[key(name, mode), value]]));
    n.choice = { value, reason };
    return touched;
  }

  private first(name: string): string {
    return this.modesOf(name)[0] ?? '';
  }

  /** Puts a seed's token in every mode of its axis. */
  private place(seed: Seed, addedBy?: string): void {
    const axis = seed.axis ?? Object.keys(this.axes)[0] ?? '';
    if (!this.axes[axis])
      throw new Refused('unknown-token', `"${seed.name}" is on an axis there is none of: ${axis}`);
    this.axisOf.set(seed.name, axis);
    const first = this.first(seed.name);
    for (const mode of this.modesOf(seed.name)) {
      const def =
        seed.modes?.[mode] ??
        (mode === first ? ownDef(seed) : 'rule' in seed ? ownDef(seed) : { follows: first });
      this.nodes.set(key(seed.name, mode), {
        name: seed.name,
        mode,
        def,
        value: undefined,
        reads: new Set(),
        ...(addedBy ? { addedBy } : {}),
      });
    }
  }

  /**
   * Makes again every changed token and everything that reads it, recording
   * what each reads. `fixed` holds chosen values. Writes nothing unless every
   * rule succeeds.
   */
  private commit(
    changed: ReadonlySet<string>,
    fixed: ReadonlyMap<string, unknown>,
  ): readonly string[] {
    const dirty = new Set<string>();
    for (const k of changed) {
      dirty.add(k);
      for (const d of this.downstream(k)) dirty.add(d);
    }
    const made = new Map<string, { value: unknown; reads: Set<string> }>();
    const making = new Set<string>();
    const value = (k: string): unknown => {
      const done = made.get(k);
      if (done) return done.value;
      const n = this.node(k);
      if (!dirty.has(k)) return n.value;
      if (fixed.has(k) || (n.choice && !changed.has(k))) {
        const v = fixed.has(k) ? fixed.get(k) : n.choice?.value;
        made.set(k, { value: v, reads: new Set() });
        return v;
      }
      if (making.has(k)) throw new Refused('cycle', `"${n.name}" depends on itself`);
      making.add(k);
      const reads = new Set<string>();
      const get = (name: string, mode?: string): unknown => {
        const r = key(
          name,
          mode ?? (this.modesOf(name).includes(n.mode) ? n.mode : this.first(name)),
        );
        if (!this.nodes.has(r))
          throw new Refused('unknown-token', `"${n.name}" reads "${name}", which is not a token`);
        reads.add(r);
        return value(r);
      };
      const v = this.make(n, get);
      making.delete(k);
      made.set(k, { value: v, reads });
      return v;
    };
    for (const k of dirty) value(k);
    for (const [k, m] of made) {
      const n = this.node(k);
      for (const r of n.reads) this.readers.get(r)?.delete(k);
      for (const r of m.reads) this.readers.set(r, (this.readers.get(r) ?? new Set()).add(k));
      n.reads = m.reads;
      n.value = m.value;
    }
    return [...made.keys()];
  }

  private make(n: Node, get: (name: string, mode?: string) => unknown): unknown {
    if ('value' in n.def) return n.def.value;
    if ('follows' in n.def) return get(n.name, n.def.follows);
    const rule = this.rules.get(n.def.rule);
    if (!rule) throw new Refused('unknown-rule', `"${n.def.rule}" is not a rule`);
    try {
      return rule(n.def.args, { get, mode: n.mode, name: n.name });
    } catch (e) {
      if (e instanceof Refused) throw e;
      throw new Refused(
        'rule-failed',
        `"${n.name}" (${n.mode}): ${e instanceof Error ? e.message : String(e)}`,
      );
    }
  }

  private add(name: string, value: unknown, reason: string): readonly string[] {
    for (const [kind, maker] of this.makers) {
      const seeds = maker(name, value);
      if (!seeds) continue;
      const taken = seeds.find((s) => this.has(s.name));
      if (taken) throw new Refused('name-taken', `"${taken.name}" already exists`);
      for (const s of seeds) this.place(s, name);
      const keys = new Set(seeds.flatMap((s) => this.modesOf(s.name).map((m) => key(s.name, m))));
      try {
        this.commit(keys, new Map());
      } catch (e) {
        for (const k of keys) this.nodes.delete(k);
        for (const s of seeds) this.axisOf.delete(s.name);
        throw e;
      }
      this.node(key(name, this.first(name))).added = { kind, value, reason };
      return seeds.map((s) => s.name);
    }
    throw new Refused(
      'unknown-token',
      `"${name}" is not a token, and not a font, colour or fill a designer can add`,
    );
  }

  private remove(name: string): readonly string[] {
    const group = [...this.nodes.values()].filter((n) => n.addedBy === name);
    const keys = new Set(group.map((n) => key(n.name, n.mode)));
    const outside = [
      ...new Set(group.flatMap((n) => [...(this.readers.get(key(n.name, n.mode)) ?? [])])),
    ].filter((k) => !keys.has(k));
    if (outside.length > 0)
      throw new Refused(
        'in-use',
        `"${name}" is read by ${[...new Set(outside.map((k) => this.node(k).name))].join(', ')}`,
      );
    for (const n of group) {
      for (const r of n.reads) this.readers.get(r)?.delete(key(n.name, n.mode));
      this.readers.delete(key(n.name, n.mode));
    }
    for (const k of keys) this.nodes.delete(k);
    for (const n of group) this.axisOf.delete(n.name);
    return [...new Set(group.map((n) => n.name))];
  }

  private downstream(k: string): Set<string> {
    const out = new Set<string>();
    const queue = [k];
    for (let n = queue.pop(); n !== undefined; n = queue.pop()) {
      for (const d of this.readers.get(n) ?? []) {
        if (!out.has(d)) {
          out.add(d);
          queue.push(d);
        }
      }
    }
    return out;
  }

  private node(k: string): Node {
    const n = this.nodes.get(k);
    if (!n)
      throw new Refused('unknown-token', `"${k.slice(0, k.lastIndexOf('@'))}" is not a token`);
    return n;
  }
}

function ownDef(seed: Seed): Def {
  return 'rule' in seed
    ? { rule: seed.rule, ...(seed.args !== undefined ? { args: seed.args } : {}) }
    : { value: seed.value };
}
