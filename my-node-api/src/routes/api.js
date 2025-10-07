const express = require('express');
const multer = require("multer");
const fs = require("fs");
const path = require("path");
const gedcom = require("gedcom");
const { OpenAI } = require("openai");

require("dotenv").config();

const router = express.Router();
const upload = multer({ dest: "uploads/" });
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

let parsedGedcomData = null;

// Test route
router.get("/hello", (req, res) => {
  console.log("GET /hello called");
  res.send("Hello from the API!");
});

router.post("/upload", upload.single("gedcom"), (req, res) => {
  try {
    if (!req.file) {
      console.error("No file uploaded");
      return res.status(400).send({ error: "No GEDCOM file uploaded." });
    }
    const filePath = req.file.path;
    console.log(`Received file upload: ${filePath}`);
    const gedcomString = fs.readFileSync(filePath, "utf-8");
    parsedGedcomData = gedcom.parse(gedcomString);
    console.log("GEDCOM file parsed successfully");
    res.send({ message: "GEDCOM uploaded and parsed." });
  } catch (err) {
    console.error("Error processing GEDCOM upload:", err);
    res.status(500).send({ error: "Failed to process GEDCOM file." });
  }
});

router.post("/ask", express.json(), async (req, res) => {
  try {
    const { question } = req.body;
    if (!parsedGedcomData) {
      console.warn("No GEDCOM data available for /ask");
      return res.status(400).send("Upload GEDCOM first.");
    }
    if (!question) {
      console.warn("No question provided in /ask");
      return res.status(400).send("No question provided.");
    }

    console.log(`Received question: ${question}`);
    const context = summarizeGedcomForAI(parsedGedcomData);

    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: "You are a helpful genealogy assistant." },
        { role: "user", content: `Here's the family tree data:\n${context}\n\nNow answer this question: ${question}` },
      ],
      max_tokens: 1500 // Safe for most use cases under $0.05
    });

    const answer = completion.choices[0]?.message?.content || "No answer generated.";
    console.log("OpenAI response sent");
    res.send({ answer });
  } catch (err) {
    console.error("Error in /ask route:", err);
    res.status(500).send({ error: "Failed to process question." });
  }
});

function summarizeGedcomForAI(data, maxPeople = 50) {
  try {
    if (!data || !Array.isArray(data.children)) {
      console.error("GEDCOM data missing or malformed");
      return "No context available.";
    }
    const people = data.children
      .filter((child) => child.type === "INDI")
      .slice(0, maxPeople)
      .map((indi, idx) => {
        const name = indi.data?.NAME || "Unknown";
        const sex = indi.data?.SEX || "Unknown";
        const birth = indi.children?.find(c => c.type === "BIRT")?.data?.DATE || "Unknown birth date";
        const birthPlace = indi.children?.find(c => c.type === "BIRT")?.children?.find(c => c.type === "PLAC")?.data || "Unknown birth place";
        const death = indi.children?.find(c => c.type === "DEAT")?.data?.DATE || "Unknown death date";
        const deathPlace = indi.children?.find(c => c.type === "DEAT")?.children?.find(c => c.type === "PLAC")?.data || "Unknown death place";
        // Marriage events
        const marriages = indi.children
          ?.filter(c => c.type === "FAMS")
          ?.map(fam => {
            const famId = fam.data?.REF;
            // Find the family record for this marriage
            const family = data.children.find(child => child.type === "FAM" && child.pointer === famId);
            if (family) {
              const spouse = family.children?.find(c => c.type === "HUSB" || c.type === "WIFE");
              const spouseName = spouse ? spouse.data?.REF : "Unknown spouse";
              const marriage = family.children?.find(c => c.type === "MARR");
              const marriageDate = marriage?.data?.DATE || "Unknown date";
              const marriagePlace = marriage?.children?.find(c => c.type === "PLAC")?.data || "Unknown place";
              return `Married to ${spouseName} on ${marriageDate} in ${marriagePlace}`;
            }
            return null;
          })
          .filter(Boolean)
          .join("; ");
        // Immigration and occupation events
        const immigration = indi.children?.find(c => c.type === "IMMI");
        const immigrationStr = immigration
          ? `Immigrated on ${immigration.data?.DATE || "unknown date"} to ${immigration.children?.find(c => c.type === "PLAC")?.data || "unknown place"}`
          : "";
        const occupation = indi.children?.find(c => c.type === "OCCU")?.data || "";
        // Notes
        const notes = indi.children?.filter(c => c.type === "NOTE").map(n => n.data).join("; ") || "";

        return [
          `${idx + 1}. ${name} (${sex})`,
          `   Born: ${birth} in ${birthPlace}`,
          `   Died: ${death} in ${deathPlace}`,
          marriages ? `   ${marriages}` : "",
          immigrationStr ? `   ${immigrationStr}` : "",
          occupation ? `   Occupation: ${occupation}` : "",
          notes ? `   Notes: ${notes}` : ""
        ].filter(Boolean).join("\n");
      });
    return `Family Members (showing up to ${maxPeople}):\n` + people.join("\n\n");
  } catch (err) {
    console.error("Error summarizing GEDCOM for AI:", err);
    return "No context available.";
  }
}

module.exports = router;