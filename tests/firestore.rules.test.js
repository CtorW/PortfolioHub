import { readFile } from "node:fs/promises";
import assert from "node:assert/strict";
import { after, before, beforeEach, test } from "node:test";
import { assertFails, assertSucceeds, initializeTestEnvironment } from "@firebase/rules-unit-testing";
import { deleteDoc, doc, setDoc, updateDoc } from "firebase/firestore";

const projectId = "demo-portfolihub";
const emulatorAddress = process.env.FIRESTORE_EMULATOR_HOST;
const [emulatorHost, emulatorPort] = emulatorAddress?.split(":") || [];
let testEnvironment;

const validProject = overrides => ({
    title: "Campus Resource Finder",
    description: "A capstone project description.",
    imageUrl: "https://example.com/cover.jpg",
    repositoryUrl: "https://github.com/team/project",
    demoVideoUrl: "",
    facultyUid: "faculty-1",
    facultyEmail: "faculty@phinmaed.com",
    facultyName: "Faculty Publisher",
    leaderName: "Student Leader",
    category: "Systems",
    contributors: ["Team Member"],
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
    createdLabel: "Jan 1, 2026",
    ...overrides,
});

function facultyDb() {
    return testEnvironment.authenticatedContext("faculty-1", { email: "faculty@phinmaed.com" }).firestore();
}

function adminDb() {
    return testEnvironment.authenticatedContext("admin-1", { email: "admin@phinmaed.com" }).firestore();
}

before(async () => {
    if (!emulatorHost || !emulatorPort) {
        throw new Error("Start the Firestore emulator and set FIRESTORE_EMULATOR_HOST (for example 127.0.0.1:8080).");
    }
    testEnvironment = await initializeTestEnvironment({
        projectId,
        firestore: {
            host: emulatorHost,
            port: Number(emulatorPort),
            rules: await readFile(new URL("../firestore.rules", import.meta.url), "utf8"),
        },
    });
});

after(async () => {
    await testEnvironment?.cleanup();
});

beforeEach(async () => {
    await testEnvironment.clearFirestore();
    await testEnvironment.withSecurityRulesDisabled(async context => {
        await setDoc(doc(context.firestore(), "faculty", "faculty-1"), { role: "faculty", status: "approved" });
        await setDoc(doc(context.firestore(), "admin", "admin-1"), { role: "admin", status: "approved" });
    });
});

test("approved faculty can publish a valid capstone", async () => {
    await assertSucceeds(setDoc(doc(facultyDb(), "projects", "project-1"), validProject()));
});

test("faculty cannot publish an unsupported category", async () => {
    await assertFails(
        setDoc(doc(facultyDb(), "projects", "project-1"), validProject({ category: "Uncategorized" })),
    );
});

test("faculty cannot publish without a leader name", async () => {
    const project = validProject();
    delete project.leaderName;
    await assertFails(setDoc(doc(facultyDb(), "projects", "project-1"), project));
});

test("faculty cannot publish more than twelve contributors", async () => {
    await assertFails(
        setDoc(
            doc(facultyDb(), "projects", "project-1"),
            validProject({ contributors: Array.from({ length: 13 }, (_, index) => `Member ${index + 1}`) }),
        ),
    );
});

test("admin can edit content but cannot change project ownership", async () => {
    await testEnvironment.withSecurityRulesDisabled(async context => {
        await setDoc(doc(context.firestore(), "projects", "project-1"), validProject());
    });
    await assertSucceeds(updateDoc(doc(adminDb(), "projects", "project-1"), { title: "Updated title" }));
    await assertFails(updateDoc(doc(adminDb(), "projects", "project-1"), { facultyUid: "another-user" }));
});

test("non-admin cannot edit or delete a project", async () => {
    await testEnvironment.withSecurityRulesDisabled(async context => {
        await setDoc(doc(context.firestore(), "projects", "project-1"), validProject());
    });
    await assertFails(updateDoc(doc(facultyDb(), "projects", "project-1"), { title: "Changed title" }));
    await assertFails(deleteDoc(doc(facultyDb(), "projects", "project-1")));
});
