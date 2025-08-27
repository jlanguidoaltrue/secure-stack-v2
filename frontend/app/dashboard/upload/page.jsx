"use client";
import { useEffect, useState } from "react";
import api from "../../../lib/api.js";
import { Paper, Typography, Button, List, ListItem, Link } from "@mui/material";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";

export default function UploadPage() {
  const [file, setFile] = useState(null);
  const [msg, setMsg] = useState("");
  const [uploading, setUploading] = useState(false);
  const [uploaded, setUploaded] = useState(null); // last uploaded doc from server
  const [files, setFiles] = useState([]); // list from GET /api/uploads

  const base = process.env.NEXT_PUBLIC_API_URL;

  const fetchFiles = async () => {
    try {
      const res = await api.get("/uploads"); // expects [{_id, originalName, url, ...}]
      setFiles(res.data.data || []);
    } catch (e) {
      setMsg(e.response?.data?.message || "Failed to fetch files");
    }
  };

  useEffect(() => {
    fetchFiles();
  }, []);

  const submit = async () => {
    setMsg("");
    if (!file || uploading) return;
    setUploading(true);
    const form = new FormData();
    form.append("file", file);
    try {
      const res = await api.post("/uploads", form, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      const doc = res.data.data; // { url, originalName, size, mimetype, ... }
      setUploaded(doc);
      setMsg("Uploaded!");
      setFile(null); // only clear the input; DO NOT clear uploaded/url
      fetchFiles(); // refresh the list
    } catch (e) {
      setMsg(e.response?.data?.message || "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const deleteFile = async (id) => {
    if (!confirm("Are you sure you want to delete this file?")) return;
    try {
      await api.delete(`/uploads/${id}`);
      setMsg("File deleted");
      fetchFiles(); // refresh the list
    } catch (e) {
      setMsg(e.response?.data?.message || "Delete failed");
    }
  };

  return (
    <section className="space-y-4">
      <Typography variant="h5">Upload tester</Typography>

      <Paper className="p-4 space-y-3">
        <input
          type="file"
          onChange={(e) => setFile(e.target.files?.[0] || null)}
        />
        <Button variant="contained" onClick={submit} disabled={uploading}>
          {uploading ? "Uploading…" : "Upload"}
        </Button>

        <Typography color={msg.includes("fail") ? "error" : "success"}>
          {msg}
        </Typography>

        {uploaded && (
          <p>
            Last upload:{" "}
            <Link
              href={`${base}${uploaded.url}`}
              target="_blank"
              rel="noreferrer"
            >
              {uploaded.originalName}
            </Link>
          </p>
        )}
      </Paper>

      <Paper className="p-4 space-y-3">
        <Typography variant="subtitle1">Your files</Typography>
        <List dense>
          {files.map((f) => (
            <ListItem key={f._id}>
              <Link href={`${base}${f.url}`} target="_blank" rel="noreferrer">
                {f.originalName}
              </Link>
              <Button onClick={() => deleteFile(f._id)}>
                <DeleteOutlineIcon />
              </Button>
            </ListItem>
          ))}
          {files.length === 0 && (
            <Typography color="text.secondary">No files yet.</Typography>
          )}
        </List>
      </Paper>
    </section>
  );
}
