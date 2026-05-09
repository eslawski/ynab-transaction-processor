import { describe, it, expect } from "vitest";
import { parseFixtureEmails, loadFixtureEmails } from "@/gmail/fixtures";

const sample = `# alpha
First fixture

- **fromAddress**: auto-confirm@amazon.com
- **emailDate**: 2025-11-16T11:37:55.000Z
- **emailSubject**: Subject: Ordered: "Widget"
- **emailBody**:

\`\`\`html
<p>alpha body</p>
\`\`\`

# beta
Second fixture

- **fromAddress**: auto-confirm@amazon.com
- **emailDate**: 2025-12-14T17:29:55.000Z
- **emailSubject**: Ordered: "Gadget"
- **emailBody**:

\`\`\`html
<p>beta body</p>
\`\`\`
`;

describe("parseFixtureEmails", () => {
  it("returns one RawEmail per # section", () => {
    const emails = parseFixtureEmails(sample);
    expect(emails).toHaveLength(2);
    expect(emails.map((e) => e.id)).toEqual(["fixture-alpha", "fixture-beta"]);
  });

  it("strips the 'Subject:' prefix when present", () => {
    const [alpha, beta] = parseFixtureEmails(sample);
    expect(alpha?.subject).toBe('Ordered: "Widget"');
    expect(beta?.subject).toBe('Ordered: "Gadget"');
  });

  it("captures the email body from the html code block, trimmed", () => {
    const [alpha] = parseFixtureEmails(sample);
    expect(alpha?.body).toBe("<p>alpha body</p>");
  });

  it("uses the emailDate field for the date", () => {
    const [alpha, beta] = parseFixtureEmails(sample);
    expect(alpha?.date).toBe("2025-11-16T11:37:55.000Z");
    expect(beta?.date).toBe("2025-12-14T17:29:55.000Z");
  });

  it("starts every email in the unprocessed parse status", () => {
    const emails = parseFixtureEmails(sample);
    for (const email of emails) {
      expect(email.parseStatus).toBe("unprocessed");
    }
  });

  it("skips sections missing required fields", () => {
    const broken = `# missing-body
- **emailSubject**: x
- **emailDate**: 2025-01-01T00:00:00.000Z

# good
- **emailSubject**: y
- **emailDate**: 2025-01-02T00:00:00.000Z
- **emailBody**:

\`\`\`html
<p>ok</p>
\`\`\`
`;
    const emails = parseFixtureEmails(broken);
    expect(emails.map((e) => e.id)).toEqual(["fixture-good"]);
  });
});

describe("loadFixtureEmails", () => {
  it("loads the project-files/example-emails.md file from disk", () => {
    const emails = loadFixtureEmails();
    expect(emails.length).toBeGreaterThan(0);
    for (const email of emails) {
      expect(email.id).toMatch(/^fixture-/);
      expect(email.subject.length).toBeGreaterThan(0);
      expect(email.body.length).toBeGreaterThan(0);
      expect(email.parseStatus).toBe("unprocessed");
    }
  });
});
