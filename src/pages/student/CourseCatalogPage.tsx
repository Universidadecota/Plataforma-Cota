import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { BookOpen, Clock, Search, SlidersHorizontal, CheckCircle } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuthStore } from "@/stores/authStore";
import { CATEGORY_IMAGES, DEFAULT_COURSE_IMAGE, LEVEL_LABELS, CATEGORY_LABELS } from "@/constants";
import { toast } from "sonner";
import type { Course } from "@/types";

export default function CourseCatalogPage() {
  const { user } = useAuthStore();
  const [courses, setCourses] = useState<Course[]>([]);
  const [enrolledIds, setEnrolledIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [levelFilter, setLevelFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        const { data: coursesData, error: errCourses } = await supabase
          .from("courses")
          .select("*")
          .eq("is_published", true)
          .order("order_index");
        if (errCourses) throw errCourses;

        const { data: enrData, error: errEnr } = await supabase
          .from("enrollments")
          .select("course_id")
          .eq("student_id", user!.id);
        if (errEnr) throw errEnr;

        setCourses(coursesData || []);
        setEnrolledIds((enrData || []).map((e) => e.course_id));
      } catch (error) {
        console.error(error);
        toast.error("Erro ao carregar o catálogo de trilhas.");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [user]);

  const handleEnroll = async (courseId: string) => {
    try {
      const { error } = await supabase.from("enrollments").insert({ student_id: user!.id, course_id: courseId });
      if (error) throw error;
      setEnrolledIds((prev) => [...prev, courseId]);
      toast.success("Matrícula realizada com sucesso!");
    } catch (error) {
      console.error(error);
      toast.error("Erro ao realizar matrícula.");
    }
  };

  const filtered = courses.filter((c) => {
    const matchSearch = c.title.toLowerCase().includes(search.toLowerCase()) ||
      (c.description || "").toLowerCase().includes(search.toLowerCase());
    const matchLevel = levelFilter === "all" || c.level === levelFilter;
    const matchCat = categoryFilter === "all" || c.category === categoryFilter;
    return matchSearch && matchLevel && matchCat;
  });

  const categories = [...new Set(courses.map((c) => c.category).filter(Boolean))];

  return (
    <div>
      <h1 className="page-header">Catálogo de Trilhas</h1>
      <p className="page-subtitle">Explore todas as trilhas de formação disponíveis</p>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-gray-100 p-4 mb-6 flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar trilhas..."
            className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-cota-green/30 focus:border-cota-green"
          />
        </div>
        <div className="flex gap-2">
          <div className="relative">
            <SlidersHorizontal className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
            <select
              value={levelFilter}
              onChange={(e) => setLevelFilter(e.target.value)}
              className="pl-8 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-cota-green/30 text-gray-700 bg-white"
            >
              <option value="all">Todos os níveis</option>
              <option value="beginner">Iniciante</option>
              <option value="intermediate">Intermediário</option>
              <option value="advanced">Avançado</option>
            </select>
          </div>
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-cota-green/30 text-gray-700 bg-white"
          >
            <option value="all">Todas as áreas</option>
            {categories.map((cat) => (
              <option key={cat} value={cat!}>{CATEGORY_LABELS[cat!] || cat}</option>
            ))}
          </select>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="w-8 h-8 border-4 border-cota-green border-t-transparent rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <BookOpen className="w-12 h-12 mx-auto mb-3 text-gray-200" />
          <p className="font-medium">Nenhuma trilha encontrada</p>
          <p className="text-sm">Tente ajustar os filtros de busca</p>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-5">
          {filtered.map((course) => {
            const isEnrolled = enrolledIds.includes(course.id);
            const coverImg = course.cover_image || CATEGORY_IMAGES[course.category || ""] || DEFAULT_COURSE_IMAGE;
            return (
              <div key={course.id} className="bg-white rounded-xl border border-gray-100 overflow-hidden shadow-sm hover:shadow-md transition-all group">
                <div className="relative">
                  <img src={coverImg} alt={course.title} className="w-full h-44 object-cover group-hover:scale-105 transition-transform duration-300" />
                  <div className="absolute top-3 left-3">
                    <span className={`badge-level-${course.level} shadow-sm`}>{LEVEL_LABELS[course.level]}</span>
                  </div>
                  {isEnrolled && (
                    <div className="absolute top-3 right-3 bg-cota-green text-white text-xs font-bold px-2 py-1 rounded-full flex items-center gap-1">
                      <CheckCircle className="w-3 h-3" /> Matriculado
                    </div>
                  )}
                </div>

                <div className="p-5">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xs text-gray-400 font-medium uppercase tracking-wide">
                      {CATEGORY_LABELS[course.category || ""] || course.category}
                    </span>
                  </div>
                  <h3 className="font-bold text-gray-800 text-base leading-tight mb-2 group-hover:text-cota-green transition-colors">
                    {course.title}
                  </h3>
                  <p className="text-sm text-gray-500 line-clamp-2 mb-4">{course.description}</p>

                  <div className="flex items-center gap-3 text-xs text-gray-400 mb-4">
                    <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" />{course.duration_hours}h</span>
                    <span className="flex items-center gap-1"><BookOpen className="w-3.5 h-3.5" />Certificado incluso</span>
                  </div>

                  {isEnrolled ? (
                    <Link to={`/courses/${course.id}`}
                      className="block w-full text-center bg-cota-green text-white py-2.5 rounded-lg text-sm font-semibold hover:bg-cota-green-light transition-colors">
                      Continuar Trilha
                    </Link>
                  ) : (
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleEnroll(course.id)}
                        className="flex-1 bg-cota-gold hover:bg-cota-gold-dark text-cota-green-dark py-2.5 rounded-lg text-sm font-bold transition-colors"
                      >
                        Matricular-se
                      </button>
                      <Link to={`/courses/${course.id}`}
                        className="px-4 py-2.5 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition-colors">
                        Ver
                      </Link>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}