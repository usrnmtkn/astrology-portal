#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const reviewRoot = path.join(repoRoot, "packages/astro-knowledge/review/sky-calendar-exact-approved-2026-09-05-north-node-48");
const ruling = JSON.parse(fs.readFileSync(path.join(reviewRoot, "owner-ruling.json"), "utf8"));
const rows = ruling.payloadFiles.flatMap((file) => JSON.parse(fs.readFileSync(path.join(reviewRoot, file), "utf8")).rows);
const expected = {
  "sky.aspect.sun.conjunction.north-node": "5a977317e8c16626fdeab716ed453688cb7357b083f531dc731ad94db07bd957",
  "sky.aspect.sun.sextile.north-node": "0f1369d286faea6ced0e5e145ff27b41ac2d2f848e91ca5be5143fc34504731b",
  "sky.aspect.sun.square.north-node": "4329915f227323a652db73f46d9865b3eb61ce78f190b5f805a7d7e5fa90385f",
  "sky.aspect.sun.opposition.north-node": "d1205710af88844b1d81175d1d7ed4f8f6bb9092b2291b20743ab3e69048f50b",
  "sky.aspect.moon.conjunction.north-node": "cbe3fdb27f9a1292548c6f8cd8a6f2708e7f9916457c2ea8b02d45a5322e6f91",
  "sky.aspect.moon.sextile.north-node": "2b717b54c6bd23a37c5e17d2219e3fd946a6988ea2fc1a9bacdc835a7c2f3dc0",
  "sky.aspect.moon.square.north-node": "6692337f2c46179a641e73252b6336fb00e3a2d353c58a1e82f7a297f30fa4b9",
  "sky.aspect.moon.opposition.north-node": "931d035a32e2b5e69f61fe2e92bf082f7248f8e32a1fe0e7315540f3c1736213",
  "sky.aspect.mercury.conjunction.north-node": "9aca7ae522a1a899962a59b611dc60a70184357cec60f5dd4bba38d3745e4e34",
  "sky.aspect.mercury.sextile.north-node": "a252b8d15597224b09d92acbe03454d9dfc779aa37c7c1b6bd7d2684d6c5dcc7",
  "sky.aspect.mercury.square.north-node": "e57ea6451c117ecec5c313c2889e41a4145d0f2c0e187550211eac4c97b59610",
  "sky.aspect.mercury.opposition.north-node": "c67934aab7a08ae04e5c7d3f22b621beb6a5ef57a36ead122d71a325d96ad6c8",
  "sky.aspect.venus.conjunction.north-node": "2ff3464961c3aafed608d0371274e6117b7894cb8384f57eac7439df866dae0d",
  "sky.aspect.venus.sextile.north-node": "4a6751217384ab03a8992eddb3bba100b86b8e753d81497a1dd903e9965038c7",
  "sky.aspect.venus.square.north-node": "c235e2953ea269ca543b575a03554cc4d7c39be75cc436af6cdd2e6d862ad8de",
  "sky.aspect.venus.opposition.north-node": "f1a4fec3934cadf08740c20df1cc31bad65dd5e4c939df0c8fa554c914005b01",
  "sky.aspect.mars.conjunction.north-node": "a57939e6a182551734b25251d4d1bce4e5ed0ddc97181448c84a2ebb69065209",
  "sky.aspect.mars.sextile.north-node": "ebebdd9f4fbc1e587cb0ccdd043c8de3349cd5fca873910dfe8e1a4d308ac72f",
  "sky.aspect.mars.square.north-node": "b35113312c3fe0bb161b3e5fcfb07b3552495fceb081888b5f3908563bd48a00",
  "sky.aspect.mars.opposition.north-node": "5b78282baf2cd92bc6f426f017a517210756b19b75dd8c16a9b771861077d288",
  "sky.aspect.jupiter.conjunction.north-node": "b7a690e5aac958eeac101a9de4acfb82482bd3961497407bb1d9e9be167b9a80",
  "sky.aspect.jupiter.sextile.north-node": "a47b3507d94413f11e8a9b4ea2407c6f3f06b9721d99522635032ccb04569eab",
  "sky.aspect.jupiter.square.north-node": "c83a8a23562578a8d9b976bd187825d17aa6d3449ad250318e1f7ef1ebc6d4d0",
  "sky.aspect.jupiter.opposition.north-node": "5c69b81aa5035b105d38ba8381682b61853b5c5dd565ab65102d255e331beb21",
  "sky.aspect.saturn.conjunction.north-node": "394d3f6a7206cd4dab2037ac22b8be721dd6517b8fc883369a6116a989a17efd",
  "sky.aspect.saturn.sextile.north-node": "4da351adf39d6fa50d0bb492b820ac8dad40214d4775bec6717021e6e914f4c4",
  "sky.aspect.saturn.square.north-node": "fce14dc8c305319b2fca1a277187cde670332a4479a7424fa38893159d237559",
  "sky.aspect.saturn.opposition.north-node": "2f26d1f911e90b5ce93fefd5a9113608e5f1a0da6585639f35986d5677e06b03",
  "sky.aspect.uranus.conjunction.north-node": "5e9153161fbae703f0bd5d8a6b594a10f876d48ceb6d51f26037af6a5cf0a3ea",
  "sky.aspect.uranus.sextile.north-node": "c9397c99df1bfcb45f8401aae6f2c8ae45c4ad3e703c6fd271567d100a8f99f4",
  "sky.aspect.uranus.square.north-node": "08509e707c05c3efad6d68f4896da69f873543014865b1bb9f9461369d7dd9f4",
  "sky.aspect.uranus.opposition.north-node": "a45f2ba0e66a3d5e055bd9b6b495325733dcb04d12ac42ad6e89a3f678bf384b",
  "sky.aspect.neptune.conjunction.north-node": "e009ca5ee7f3a0de13f7a45f6fe3884d9fb80939e7186e8c313aa2037127a314",
  "sky.aspect.neptune.sextile.north-node": "7c3b44dbb681c86bbc2c9a7d440a80cf6b7d9a2e6506e521f6a988bbed2ee47e",
  "sky.aspect.neptune.square.north-node": "7f75ed914c672682ad0684d9941d77bb2f51fb7c558d29684458f8b33a53f397",
  "sky.aspect.neptune.opposition.north-node": "89e9d06739cd1e81e237447991bdc8da4cae863d24d2aca1bcc956487691600a",
  "sky.aspect.pluto.conjunction.north-node": "ac4bbf7690364e995bdbc756ab06639c3323153a3c968808dc97061ac4a0fa46",
  "sky.aspect.pluto.sextile.north-node": "e0a9144d4f00e24a2c56a44732bd216a954476ddac3a41482e52ade1bc24df29",
  "sky.aspect.pluto.square.north-node": "369c5f5dfc3a395961da1b8981ab8153b14677c3480755be8d025de3d2403320",
  "sky.aspect.pluto.opposition.north-node": "6db5186470b185e0b1f63f6443f464a71d5ae6bc3254578cc0d3ac9315648f68",
  "sky.aspect.chiron.conjunction.north-node": "c1f0df5deb48ab54b239dc809c6add50df38694e2832b71f28c6dc2cbd17c267",
  "sky.aspect.chiron.sextile.north-node": "a3042b9bafd3b466bb192af1a51a2de2ca9d7d90e5ba697c0e6bd6f2b3e9e670",
  "sky.aspect.chiron.square.north-node": "ee8bfca515d1ec2f16288a931f521df1de9dae4e59554d2624e96db6a690a6f8",
  "sky.aspect.chiron.opposition.north-node": "a303bdd35d62baa486d13e23348ef05d7b0bd214037b569f0f0dc8bdfb91cd1d",
  "sky.aspect.lilith.conjunction.north-node": "8bd5b0b7dd1a7dd44921613d95c594b9d2b053340ade6b36706fe07f5f755d00",
  "sky.aspect.lilith.sextile.north-node": "7fb9c750367ff27ad06f26fb0d9d1b21532be22d428c675c1286925f0a5bc07b",
  "sky.aspect.lilith.square.north-node": "9b0480af13de7ab698331a151530b346910fbb2b3df2246131000aaa78937c14",
  "sky.aspect.lilith.opposition.north-node": "03dbf33b362663cf46a1887f68ff8f79e65c1fc54fd59d374983731452d1c08c"
};

assert.equal(rows.length, 48);
assert.equal(Object.keys(expected).length, 48);
const mismatches = [];
for (const row of rows) {
  const expectedSha = expected[row.contentKey];
  if (!expectedSha) mismatches.push({ contentKey: row.contentKey, problem: "not in exact-owner-approved source" });
  else if (row.bodySha256 !== expectedSha) mismatches.push({ contentKey: row.contentKey, expectedSha, actualSha: row.bodySha256 });
}
for (const key of Object.keys(expected)) {
  if (!rows.some((row) => row.contentKey === key)) mismatches.push({ contentKey: key, problem: "missing from release" });
}
if (mismatches.length) {
  console.error(JSON.stringify({ status: "FAIL", mismatches }, null, 2));
  process.exit(1);
}
console.log(JSON.stringify({ status: "PASS", rows: 48 }, null, 2));
