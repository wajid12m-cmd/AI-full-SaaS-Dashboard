"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { FaPlus, FaEdit, FaTrash, FaSearch, FaChevronLeft, FaChevronRight } from "react-icons/fa";
import Modal from "@/components/modal";
import EmptyState from "@/components/EmptyState";
import { SkeletonCardGrid } from "@/components/Skeleton";
import {
  getProjects,
  createProject,
  updateProject,
  deleteProject,
  Project,
  Pagination,
} from "@/services/projectService";

export default function ProjectsPage() {
  const searchParams = useSearchParams();
  const [projects, setProjects] = useState<Project[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState(searchParams.get("search") || "");

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const loadProjects = async (targetPage: number) => {
    try {
      setLoading(true);
      const res = await getProjects(targetPage, 6);
      setProjects(res.data.projects);
      setPagination(res.data.pagination);
    } catch (err) {
      console.error("Failed to load projects:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProjects(page);
  }, [page]);

  const openCreateModal = () => {
    setEditingProject(null);
    setName("");
    setDescription("");
    setError("");
    setIsModalOpen(true);
  };

  const openEditModal = (project: Project) => {
    setEditingProject(project);
    setName(project.name);
    setDescription(project.description || "");
    setError("");
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!name.trim()) {
      setError("Project name is required");
      return;
    }

    setSaving(true);

    try {
      if (editingProject) {
        await updateProject(editingProject.id, { name, description });
      } else {
        await createProject(name, description);
      }

      setIsModalOpen(false);
      await loadProjects(page);
    } catch (err) {
      const axiosError = err as {
        response?: { data?: { message?: string } };
      };
      setError(
        axiosError?.response?.data?.message || "Something went wrong"
      );
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    const confirmed = window.confirm(
      "Are you sure you want to delete this project?"
    );
    if (!confirmed) return;

    try {
      await deleteProject(id);
      await loadProjects(page);
    } catch (err) {
      console.error("Failed to delete project:", err);
    }
  };

  // Search abhi current page ke projects par hi filter karta hai
  const filteredProjects = projects.filter((project) =>
    project.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-gray-50">Projects</h1>

        <button
          onClick={openCreateModal}
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
        >
          <FaPlus /> New Project
        </button>
      </div>

      <div className="relative mb-6 max-w-sm">
        <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          placeholder="Search projects..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full border dark:border-gray-700 rounded-lg pl-10 pr-4 py-2 bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {loading ? (
        <SkeletonCardGrid count={6} />
      ) : filteredProjects.length === 0 ? (
        <div className="bg-white dark:bg-gray-900 rounded-xl shadow-md border dark:border-gray-700">
          <EmptyState
            title={search ? "No projects match your search" : "No projects yet"}
            description={
              search
                ? "Try a different search term."
                : "Create your first project to start organizing your work."
            }
            actionLabel={search ? undefined : "Create Project"}
            onAction={search ? undefined : openCreateModal}
          />
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredProjects.map((project) => (
              <div
                key={project.id}
                className="bg-white dark:bg-gray-900 rounded-xl shadow-md border dark:border-gray-700 p-5 flex flex-col justify-between transition-colors"
              >
                <div>
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="font-bold text-lg text-gray-900 dark:text-gray-50">{project.name}</h3>
                    <span
                      className={`text-xs px-2 py-1 rounded-full ${
                        project.status === "active"
                          ? "bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300"
                          : "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300"
                      }`}
                    >
                      {project.status}
                    </span>
                  </div>

                  <p className="text-gray-600 dark:text-gray-400 text-sm mb-4">
                    {project.description || "No description."}
                  </p>

                  <p className="text-xs text-gray-400 dark:text-gray-500">
                    Created:{" "}
                    {new Date(project.createdAt).toLocaleDateString()}
                  </p>
                </div>

                <div className="flex gap-3 mt-4 pt-4 border-t dark:border-gray-700">
                <button
                  onClick={() => openEditModal(project)}
                  aria-label={`Edit ${project.name}`}
                  className="flex items-center gap-1 text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 rounded"
                >
                  <FaEdit aria-hidden="true" /> Edit
                </button>

                <button
                  onClick={() => handleDelete(project.id)}
                  aria-label={`Delete ${project.name}`}
                  className="flex items-center gap-1 text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300 text-sm focus:outline-none focus:ring-2 focus:ring-red-500 rounded"
                >
                  <FaTrash aria-hidden="true" /> Delete
                </button>  
                </div>
              </div>
            ))}
          </div>

          {/* Pagination Controls */}
          {pagination && pagination.totalPages > 1 && !search && (
            <div className="flex items-center justify-center gap-4 mt-8">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="flex items-center gap-2 px-3 py-2 rounded-lg border dark:border-gray-700 text-gray-700 dark:text-gray-200 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-100 dark:hover:bg-gray-800"
              >
                <FaChevronLeft /> Previous
              </button>

              <span className="text-sm text-gray-600 dark:text-gray-400">
                Page {pagination.page} of {pagination.totalPages}
              </span>

              <button
                onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
                disabled={page === pagination.totalPages}
                className="flex items-center gap-2 px-3 py-2 rounded-lg border dark:border-gray-700 text-gray-700 dark:text-gray-200 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-100 dark:hover:bg-gray-800"
              >
                Next <FaChevronRight />
              </button>
            </div>
          )}
        </>
      )}

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingProject ? "Edit Project" : "New Project"}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <p className="bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-300 text-sm p-2 rounded">
              {error}
            </p>
          )}

          <div>
            <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">
              Project Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full border dark:border-gray-700 rounded-lg px-4 py-2 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="e.g. Marketing Website"
            />
          </div>

          <div>
            <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="w-full border dark:border-gray-700 rounded-lg px-4 py-2 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Short description (optional)"
            />
          </div>

          <button
            type="submit"
            disabled={saving}
            className="w-full bg-blue-600 text-white rounded-lg py-2 font-medium hover:bg-blue-700 disabled:opacity-60"
          >
            {saving
              ? "Saving..."
              : editingProject
              ? "Update Project"
              : "Create Project"}
          </button>
        </form>
      </Modal>
    </div>
  );
}