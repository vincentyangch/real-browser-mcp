export type DomainPolicy = {
  allowDomains: string[];
  denyDomains: string[];
};

export type DomainPolicyDecision =
  | {
      ok: true;
      host: string;
    }
  | {
      ok: false;
      host: string | null;
      reason: string;
    };

export function normalizeDomainRule(rule: string): string {
  return rule.trim().replace(/^\.+/, "").toLowerCase();
}

export function normalizeDomainRules(rules: string[]): string[] {
  const normalized = rules
    .map((rule) => normalizeDomainRule(rule))
    .filter((rule) => rule.length > 0);

  return Array.from(new Set(normalized));
}

function matchesDomainRule(host: string, rule: string): boolean {
  return host === rule || host.endsWith(`.${rule}`);
}

export function evaluateDomainPolicy(policy: DomainPolicy, url: string): DomainPolicyDecision {
  let parsedUrl: URL;

  try {
    parsedUrl = new URL(url);
  } catch {
    return {
      ok: false,
      host: null,
      reason: `Invalid URL for domain policy: '${url}'`,
    };
  }

  const host = parsedUrl.hostname.toLowerCase();
  const deniedBy = policy.denyDomains.find((rule) => matchesDomainRule(host, rule));
  if (deniedBy) {
    return {
      ok: false,
      host,
      reason: `Domain '${host}' is blocked by deny rule '${deniedBy}'`,
    };
  }

  if (policy.allowDomains.length === 0) {
    return {
      ok: true,
      host,
    };
  }

  const allowedBy = policy.allowDomains.find((rule) => matchesDomainRule(host, rule));
  if (allowedBy) {
    return {
      ok: true,
      host,
    };
  }

  return {
    ok: false,
    host,
    reason: `Domain '${host}' is not included in the allow list`,
  };
}

export function describeDomainPolicy(policy: DomainPolicy): string | null {
  if (policy.allowDomains.length === 0 && policy.denyDomains.length === 0) {
    return null;
  }

  const allowPart =
    policy.allowDomains.length > 0 ? policy.allowDomains.join(", ") : "<all>";
  const denyPart =
    policy.denyDomains.length > 0 ? policy.denyDomains.join(", ") : "<none>";

  return `Domain policy active. allow=${allowPart}; deny=${denyPart}`;
}
