import { useState } from "react";
import toast from "react-hot-toast";

import api from "../services/api";

interface ResumeUploadResponse {
  resume_id: string;
  skills: string[];
  job_titles: string[];
  years_experience: number;
  education_level: string;
  uploaded_at: string;
}

export default function ResumePage() {
  const [result, setResult] = useState<ResumeUploadResponse | null>(null);
  const [skillsDraft, setSkillsDraft] = useState("");
  const [yearsExperienceDraft, setYearsExperienceDraft] = useState(0);
  const [educationDraft, setEducationDraft] = useState("");

  const onUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error("File must be 5MB or less");
      return;
    }

    const formData = new FormData();
    formData.append("file", file);

    const response = await api.post<ResumeUploadResponse>("/resume/upload", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    setResult(response.data);
    setSkillsDraft(response.data.skills.join(", "));
    setYearsExperienceDraft(response.data.years_experience);
    setEducationDraft(response.data.education_level);
    toast.success("Resume parsed successfully");
  };

  return (
    <section className="space-y-6">
      <div className="card">
        <h2 className="mb-3 font-display text-2xl font-bold">Upload Resume</h2>
        <label className="flex min-h-40 cursor-pointer items-center justify-center rounded-xl border-2 border-dashed border-radar-300 bg-radar-50 text-radar-700">
          <input type="file" className="hidden" accept=".pdf,.docx" onChange={onUpload} />
          Drop PDF/DOCX or click to upload
        </label>
      </div>

      {result ? (
        <div className="card space-y-4">
          <h3 className="font-display text-xl font-semibold">Parsed Profile</h3>
          <label className="block text-sm font-medium text-radar-700">
            Years of experience
            <input
              type="number"
              min={0}
              max={60}
              value={yearsExperienceDraft}
              onChange={(event) => setYearsExperienceDraft(Number(event.target.value) || 0)}
              className="mt-1 w-full rounded-lg border border-radar-300 px-3 py-2"
            />
          </label>
          <label className="block text-sm font-medium text-radar-700">
            Education level
            <input
              value={educationDraft}
              onChange={(event) => setEducationDraft(event.target.value)}
              className="mt-1 w-full rounded-lg border border-radar-300 px-3 py-2"
            />
          </label>
          <label className="block text-sm font-medium text-radar-700">
            Skills (comma-separated)
            <textarea
              value={skillsDraft}
              onChange={(event) => setSkillsDraft(event.target.value)}
              rows={4}
              className="mt-1 w-full rounded-lg border border-radar-300 px-3 py-2"
            />
          </label>
          <div className="flex flex-wrap gap-2">
            {skillsDraft
              .split(",")
              .map((skill) => skill.trim())
              .filter(Boolean)
              .slice(0, 30)
              .map((skill) => (
              <span key={skill} className="rounded-full bg-radar-100 px-2 py-1 text-xs text-radar-700">
                {skill}
              </span>
              ))}
          </div>
        </div>
      ) : null}
    </section>
  );
}
