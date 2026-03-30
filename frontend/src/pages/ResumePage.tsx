import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useDropzone } from "react-dropzone";
import toast from "react-hot-toast";

import { deleteResume, getResume, updateResume, uploadResume } from "../services/api";
import type { Resume } from "../types";

function toDraft(resume: Resume | null) {
  return {
    skills: resume?.skills.join(", ") ?? "",
    jobTitles: resume?.job_titles.join(", ") ?? "",
    yearsExperience: resume?.years_experience ?? 0,
    educationLevel: resume?.education_level ?? "",
  };
}

export default function ResumePage() {
  const queryClient = useQueryClient();
  const { data: resume, isLoading } = useQuery({
    queryKey: ["resume"],
    queryFn: getResume,
  });
  const [uploadProgress, setUploadProgress] = useState(0);
  const [draft, setDraft] = useState(() => toDraft(null));

  useEffect(() => {
    setDraft(toDraft(resume ?? null));
  }, [resume]);

  const uploadMutation = useMutation({
    mutationFn: uploadResume,
    onSuccess: async (result) => {
      setUploadProgress(100);
      queryClient.setQueryData(["resume"], result);
      await queryClient.invalidateQueries({ queryKey: ["jobs"] });
      toast.success("Resume uploaded and parsed");
    },
    onError: () => {
      toast.error("Resume upload failed");
      setUploadProgress(0);
    },
  });

  const updateMutation = useMutation({
    mutationFn: updateResume,
    onSuccess: async (result) => {
      queryClient.setQueryData(["resume"], result);
      await queryClient.invalidateQueries({ queryKey: ["jobs"] });
      toast.success("Resume profile updated");
    },
    onError: () => toast.error("Unable to update resume profile"),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteResume,
    onSuccess: async () => {
      queryClient.setQueryData(["resume"], null);
      await queryClient.invalidateQueries({ queryKey: ["jobs"] });
      toast.success("Resume removed");
    },
    onError: () => toast.error("Unable to delete resume"),
  });

  const onDrop = async (acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (!file) {
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("File must be 5MB or less");
      return;
    }
    setUploadProgress(0);
    await uploadMutation.mutateAsync({
      file,
      onUploadProgress: setUploadProgress,
    });
  };

  const { getRootProps, getInputProps, isDragActive, open } = useDropzone({
    onDrop,
    accept: {
      "application/pdf": [".pdf"],
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document": [".docx"],
    },
    maxFiles: 1,
  });

  const previewSkills = useMemo(
    () => draft.skills.split(",").map((skill) => skill.trim()).filter(Boolean).slice(0, 24),
    [draft.skills],
  );

  return (
    <section className="space-y-6">
      <div>
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-radar-500">Resume</p>
        <h1 className="mt-2 font-display text-4xl font-bold">Keep your skill profile current</h1>
        <p className="mt-3 max-w-2xl text-radar-700">Upload a PDF or DOCX, review the extracted details, and persist edits so the matcher can rerank jobs.</p>
      </div>

      <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
        <div className="card rounded-[1.75rem]">
          <h2 className="font-display text-2xl font-bold">Upload resume</h2>
          <div
            {...getRootProps()}
            className={[
              "mt-5 flex min-h-64 cursor-pointer flex-col items-center justify-center rounded-[1.75rem] border-2 border-dashed px-6 text-center transition",
              isDragActive ? "border-radar-900 bg-radar-100" : "border-radar-300 bg-radar-50 hover:border-radar-700",
            ].join(" ")}
          >
            <input {...getInputProps()} />
            <p className="font-display text-2xl font-bold">{isDragActive ? "Drop resume to parse" : "Drop PDF or DOCX here"}</p>
            <p className="mt-3 max-w-md text-sm text-radar-700">or click to browse. Max size 5MB. Parsing extracts skills, titles, education, and experience.</p>
          </div>
          {uploadMutation.isPending ? (
            <div className="mt-5 space-y-2">
              <div className="h-3 overflow-hidden rounded-full bg-radar-100">
                <div className="h-full rounded-full bg-radar-700 transition-all" style={{ width: `${uploadProgress}%` }} />
              </div>
              <p className="text-sm text-radar-700">Uploading... {uploadProgress}%</p>
            </div>
          ) : null}
          <div className="mt-5 rounded-2xl bg-radar-50 px-4 py-4 text-sm text-radar-700">
            Current file: {resume?.original_filename ?? "No resume uploaded"}
          </div>
          <button
            type="button"
            onClick={open}
            className="mt-4 rounded-2xl border border-radar-300 px-4 py-2 text-sm font-semibold text-radar-800 transition hover:border-radar-700"
          >
            Re-upload
          </button>
        </div>

        <div className="card rounded-[1.75rem]">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="font-display text-2xl font-bold">Parsed profile</h2>
              <p className="mt-2 text-sm text-radar-700">Edit the extracted values before saving them back to the backend.</p>
            </div>
            {resume ? (
              <button
                type="button"
                onClick={() => deleteMutation.mutate()}
                disabled={deleteMutation.isPending}
                className="rounded-2xl border border-alert-red/40 px-4 py-2 text-sm font-semibold text-alert-red transition hover:bg-alert-red/10"
              >
                {deleteMutation.isPending ? "Deleting..." : "Delete"}
              </button>
            ) : null}
          </div>

          {isLoading ? <div className="mt-6 h-72 animate-pulse rounded-[1.5rem] bg-radar-100/70" /> : null}

          {!isLoading ? (
            <div className="mt-6 space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <label className="space-y-2">
                  <span className="text-sm font-semibold text-radar-800">Years of experience</span>
                  <input
                    type="number"
                    min={0}
                    max={60}
                    className="field"
                    value={draft.yearsExperience}
                    onChange={(event) => setDraft((current) => ({ ...current, yearsExperience: Number(event.target.value) || 0 }))}
                  />
                </label>
                <label className="space-y-2">
                  <span className="text-sm font-semibold text-radar-800">Education level</span>
                  <input
                    className="field"
                    value={draft.educationLevel}
                    onChange={(event) => setDraft((current) => ({ ...current, educationLevel: event.target.value }))}
                    placeholder="Bachelor's degree"
                  />
                </label>
              </div>

              {draft.educationLevel ? (
                <div className="inline-flex rounded-full bg-radar-100 px-4 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-radar-700">
                  {draft.educationLevel}
                </div>
              ) : null}

              <label className="space-y-2">
                <span className="text-sm font-semibold text-radar-800">Job titles</span>
                <textarea
                  rows={3}
                  className="field min-h-[110px]"
                  value={draft.jobTitles}
                  onChange={(event) => setDraft((current) => ({ ...current, jobTitles: event.target.value }))}
                  placeholder="Software Engineer, Backend Developer"
                />
              </label>

              <label className="space-y-2">
                <span className="text-sm font-semibold text-radar-800">Skills</span>
                <textarea
                  rows={5}
                  className="field min-h-[150px]"
                  value={draft.skills}
                  onChange={(event) => setDraft((current) => ({ ...current, skills: event.target.value }))}
                  placeholder="Python, FastAPI, React, PostgreSQL"
                />
              </label>

              <div className="flex flex-wrap gap-2">
                {previewSkills.map((skill) => (
                  <span key={skill} className="rounded-full bg-radar-100 px-3 py-1 text-xs font-medium text-radar-700">
                    {skill}
                  </span>
                ))}
                {!previewSkills.length ? <span className="text-sm text-radar-600">Upload a resume or add skills manually.</span> : null}
              </div>

              <button
                type="button"
                onClick={() =>
                  updateMutation.mutate({
                    skills: draft.skills.split(",").map((value) => value.trim()).filter(Boolean),
                    job_titles: draft.jobTitles.split(",").map((value) => value.trim()).filter(Boolean),
                    years_experience: draft.yearsExperience,
                    education_level: draft.educationLevel,
                  })
                }
                disabled={!resume || updateMutation.isPending}
                className="inline-flex items-center justify-center gap-3 rounded-2xl bg-radar-700 px-5 py-3 font-semibold text-white transition hover:bg-radar-900 disabled:cursor-not-allowed disabled:bg-radar-300"
              >
                {updateMutation.isPending ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" /> : null}
                <span>{updateMutation.isPending ? "Saving..." : "Save profile"}</span>
              </button>
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}
