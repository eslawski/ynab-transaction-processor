import { readFileSync } from "node:fs";
import path from "node:path";
import type { RawEmail } from "@/types";

const FIXTURE_PATH = path.resolve(process.cwd(), "project-files/example-emails.md");

export function loadFixtureEmails(): RawEmail[] {
  const text = readFileSync(FIXTURE_PATH, "utf-8");
  return parseFixtureEmails(text);
}

export function parseFixtureEmails(markdown: string): RawEmail[] {
  const emails: RawEmail[] = [];
  const sections = markdown.split(/^# /m).slice(1);

  for (const section of sections) {
    const newlineIdx = section.indexOf("\n");
    if (newlineIdx === -1) continue;
    const id = section.slice(0, newlineIdx).trim();
    const rest = section.slice(newlineIdx + 1);

    const subjectRaw = extractField(rest, "emailSubject");
    const date = extractField(rest, "emailDate");
    const body = extractCodeBlock(rest);

    if (!id || !subjectRaw || !date || !body) continue;

    emails.push({
      id: `fixture-${id}`,
      subject: stripSubjectPrefix(subjectRaw),
      date,
      body,
      parseStatus: "unprocessed",
    });
  }

  return emails;
}

function extractField(section: string, key: string): string | null {
  const re = new RegExp(`^-\\s+\\*\\*${key}\\*\\*:\\s*(.+)$`, "im");
  const match = section.match(re);
  return match ? match[1].trim() : null;
}

function extractCodeBlock(section: string): string | null {
  const match = section.match(/```(?:html)?\n([\s\S]*?)\n```/);
  return match ? match[1].trim() : null;
}

function stripSubjectPrefix(subject: string): string {
  return subject.replace(/^Subject:\s*/i, "");
}
