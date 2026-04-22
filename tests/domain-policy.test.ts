import test from "node:test";
import assert from "node:assert/strict";

import {
  describeDomainPolicy,
  evaluateDomainPolicy,
  normalizeDomainRule,
  normalizeDomainRules,
  type DomainPolicy,
} from "../src/policy/domain-policy.js";

test("normalizeDomainRule trims, lowercases, and strips leading dots", () => {
  assert.equal(normalizeDomainRule(" .Example.COM "), "example.com");
});

test("normalizeDomainRules removes empties and duplicates", () => {
  assert.deepEqual(
    normalizeDomainRules(["Example.com", "", " example.com ", ".api.example.com"]),
    ["example.com", "api.example.com"],
  );
});

test("evaluateDomainPolicy allows all domains when no rules are configured", () => {
  const policy: DomainPolicy = { allowDomains: [], denyDomains: [] };

  const result = evaluateDomainPolicy(policy, "https://linux.do/t/topic/1");

  assert.equal(result.ok, true);
  assert.equal(result.host, "linux.do");
});

test("evaluateDomainPolicy enforces allow lists against exact and subdomain matches", () => {
  const policy: DomainPolicy = { allowDomains: ["example.com"], denyDomains: [] };

  assert.equal(evaluateDomainPolicy(policy, "https://example.com").ok, true);
  assert.equal(evaluateDomainPolicy(policy, "https://docs.example.com/path").ok, true);
  assert.equal(evaluateDomainPolicy(policy, "https://not-example.com").ok, false);
});

test("evaluateDomainPolicy gives deny rules precedence over allow rules", () => {
  const policy: DomainPolicy = {
    allowDomains: ["example.com"],
    denyDomains: ["admin.example.com"],
  };

  const result = evaluateDomainPolicy(policy, "https://admin.example.com/settings");

  assert.equal(result.ok, false);
  assert.match(result.reason ?? "", /blocked by deny rule/i);
});

test("evaluateDomainPolicy rejects invalid URLs", () => {
  const policy: DomainPolicy = { allowDomains: [], denyDomains: [] };

  const result = evaluateDomainPolicy(policy, "not a url");

  assert.equal(result.ok, false);
  assert.match(result.reason ?? "", /invalid url/i);
});

test("describeDomainPolicy summarizes configured allow and deny rules", () => {
  const policy: DomainPolicy = {
    allowDomains: ["linux.do", "example.com"],
    denyDomains: ["discord.com"],
  };

  assert.equal(
    describeDomainPolicy(policy),
    "Domain policy active. allow=linux.do, example.com; deny=discord.com",
  );
});
