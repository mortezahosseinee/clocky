import React, { useState, useMemo } from 'react';
import { User, Project, Group, AttendanceRecord } from '../types';
import { translations, Language } from '../utils/translations';
import { StorageService } from '../utils/storage';
import { PersianDatePicker } from '../components/PersianDatePicker';
import { ConfirmModal } from '../components/ConfirmModal';
import { exportTableToPdfPrint, exportTableToExcel, ExportColumn } from '../utils/export';
import { formatMinutes, getTodayJalali } from '../utils/jalali';
import {
  FolderKanban,
  Plus,
  Edit2,
  Trash2,
  Download,
  Filter,
  Layers,
  ArrowUpDown,
  CheckCircle2,
  XCircle,
  X
} from 'lucide-react';

interface ProjectsViewProps {
  user: User;
  lang: Language;
}

export const ProjectsView: React.FC<ProjectsViewProps> = ({ user, lang }) => {
  const t = translations[lang];
  const isPersian = lang === 'fa';

  const isAdmin = user.role === 'admin';
  const isExecutive = user.role === 'executive';
  const canManageProjects = isAdmin || isExecutive;

  const [projects, setProjects] = useState<Project[]>(() => StorageService.getProjects());
  const allGroups = StorageService.getGroups();
  const allRecords = StorageService.getAttendanceRecords();

  // Filters
  const [filterStartDate, setFilterStartDate] = useState('');
  const [filterEndDate, setFilterEndDate] = useState('');
  const [filterGroupId, setFilterGroupId] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortField, setSortField] = useState<'title' | 'groups' | 'status' | 'hours' | 'notes'>('hours');
  const [sortAsc, setSortAsc] = useState(false);

  // Add / Edit Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [formTitle, setFormTitle] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formGroupIds, setFormGroupIds] = useState<string[]>([]);
  const [formIsActive, setFormIsActive] = useState(true);
  const [formError, setFormError] = useState<string | null>(null);

  // Delete Confirm
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);

  const reloadProjects = () => {
    setProjects(StorageService.getProjects());
  };

  // Projects visibility based on group assignment
  // "در واقع به کاربر دسترسی اون گروه رو میدیم بعد در لیست پروژه هاش فقط پروژه های اون گروه رو میبینه"
  const visibleProjects = useMemo(() => {
    if (isAdmin || isExecutive) {
      return projects;
    }
    return projects.filter(p =>
      p.groupIds.some(gid => user.groupIds.includes(gid))
    );
  }, [projects, isAdmin, isExecutive, user.groupIds]);

  // Calculate hours worked by user (or total if admin/inspector) on each project
  const projectStats = useMemo(() => {
    const stats: Record<string, number> = {};

    allRecords.forEach(r => {
      if (!r.projectId) return;
      // Date filter check
      const recDate = r.startDate || r.date || '';
      if (filterStartDate && recDate < filterStartDate) return;
      if (filterEndDate && recDate > filterEndDate) return;

      // User filter: if not admin/inspector, only count current user
      if (!isAdmin && user.role !== 'inspector' && r.userId !== user.id) {
        return;
      }

      stats[r.projectId] = (stats[r.projectId] || 0) + r.durationMinutes;
    });

    return stats;
  }, [allRecords, filterStartDate, filterEndDate, isAdmin, user.role, user.id]);

  // Filtered and sorted projects
  const processedProjects = useMemo(() => {
    return visibleProjects
      .filter(p => {
        if (filterStatus === 'active' && !p.isActive) return false;
        if (filterStatus === 'inactive' && p.isActive) return false;
        if (filterGroupId !== 'all' && !p.groupIds.includes(filterGroupId)) return false;

        if (searchQuery && !p.title.toLowerCase().includes(searchQuery.toLowerCase()) && !p.description?.toLowerCase().includes(searchQuery.toLowerCase())) {
          return false;
        }
        return true;
      })
      .map(p => ({
        ...p,
        calculatedMinutes: projectStats[p.id] || 0
      }))
      .sort((a, b) => {
        let diff = 0;
        if (sortField === 'title') {
          diff = a.title.localeCompare(b.title);
        } else if (sortField === 'groups') {
          diff = a.groupIds.length - b.groupIds.length;
        } else if (sortField === 'hours') {
          diff = a.calculatedMinutes - b.calculatedMinutes;
        } else if (sortField === 'status') {
          diff = (a.isActive === b.isActive ? 0 : a.isActive ? 1 : -1);
        } else if (sortField === 'notes') {
          diff = (a.description || '').localeCompare(b.description || '');
        }
        return sortAsc ? diff : -diff;
      });
  }, [visibleProjects, searchQuery, filterStatus, filterGroupId, projectStats, sortField, sortAsc]);

  const toggleSort = (field: 'title' | 'groups' | 'status' | 'hours' | 'notes') => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(field === 'title' || field === 'groups' || field === 'notes');
    }
  };

  const handleOpenAdd = () => {
    setEditingProject(null);
    setFormTitle('');
    setFormDescription('');
    setFormGroupIds(allGroups.length > 0 ? [allGroups[0].id] : []);
    setFormIsActive(true);
    setFormError(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (p: Project) => {
    setEditingProject(p);
    setFormTitle(p.title);
    setFormDescription(p.description || '');
    setFormGroupIds(p.groupIds);
    setFormIsActive(p.isActive);
    setFormError(null);
    setIsModalOpen(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim()) {
      setFormError(isPersian ? 'عنوان پروژه اجباری است.' : 'Project title is required.');
      return;
    }
    if (formGroupIds.length === 0) {
      setFormError(isPersian ? 'حداقل یک گروه سازمانی باید انتخاب شود.' : 'Select at least one group.');
      return;
    }

    const prj: Project = {
      id: editingProject ? editingProject.id : `prj-${Date.now()}`,
      title: formTitle.trim(),
      description: formDescription.trim() || undefined,
      groupIds: formGroupIds,
      isActive: formIsActive,
      createdAt: editingProject ? editingProject.createdAt : getTodayJalali()
    };

    StorageService.saveProject(prj);
    StorageService.addLog(
      editingProject ? 'UPDATE_PROJECT' : 'CREATE_PROJECT',
      `پروژه "${prj.title}" ${editingProject ? 'به‌روزرسانی' : 'تعریف'} گردید.`
    );

    setIsModalOpen(false);
    reloadProjects();
  };

  const handleDelete = () => {
    if (deleteTargetId) {
      StorageService.deleteProject(deleteTargetId);
      setDeleteTargetId(null);
      reloadProjects();
    }
  };

  // PDF Export preserving sorted & filtered table
  // "میتونه به راحتی جدولی که میبینه خروجی پی دی اف (فونت هایی که گفتم لحاظ میشه و مرتب و منظم جدول بندی اگر فارسی باشه قشنگ راست چین اگر انگلیسی همه چپ چین) در هنگام خروجی محتویات جدول که مرتب کرده (براساس هر ستونی) و فیلترها اعمال شده میاد تو گزارش"
  const handleExportPdf = () => {
    const columns: ExportColumn[] = [
      { header: t.projectCol, key: 'title', width: 25 },
      {
        header: t.groupsCol,
        key: 'groupIds',
        width: 22,
        format: (gids: string[]) =>
          gids.map(gid => allGroups.find(g => g.id === gid)?.name).filter(Boolean).join(', ')
      },
      {
        header: t.statusCol,
        key: 'isActive',
        width: 14,
        format: act => (act ? t.activeStatus : t.inactiveStatus)
      },
      {
        header: isPersian ? 'ساعات کارکرد ثبت‌شده' : 'Logged Work Hours',
        key: 'calculatedMinutes',
        width: 18,
        format: min => formatMinutes(min, isPersian)
      },
      { header: t.notesCol, key: 'description', width: 30 }
    ];

    exportTableToPdfPrint(
      isPersian ? 'گزارش پروژه‌ها و ساعات کارکرد' : 'Projects and Logged Work Report',
      filterStartDate || filterEndDate
        ? (isPersian ? `بازه زمانی: از ${filterStartDate || 'ابتدا'} تا ${filterEndDate || 'انتها'}` : `Period: ${filterStartDate} to ${filterEndDate}`)
        : (isPersian ? 'کلیه سوابق ثبت‌شده' : 'All Historical Records'),
      columns,
      processedProjects,
      isPersian
    );
  };

  const handleExportExcel = () => {
    const columns: ExportColumn[] = [
      { header: t.projectCol, key: 'title', width: 25 },
      {
        header: t.groupsCol,
        key: 'groupIds',
        width: 25,
        format: (gids: string[]) =>
          gids.map(gid => allGroups.find(g => g.id === gid)?.name).filter(Boolean).join(', ')
      },
      {
        header: t.statusCol,
        key: 'isActive',
        width: 15,
        format: act => (act ? t.activeStatus : t.inactiveStatus)
      },
      {
        header: isPersian ? 'ساعات کارکرد ثبت‌شده' : 'Logged Work Hours',
        key: 'calculatedMinutes',
        width: 20,
        format: min => formatMinutes(min, isPersian)
      },
      { header: t.notesCol, key: 'description', width: 30 }
    ];

    exportTableToExcel(
      `Projects_Report_${getTodayJalali().replace(/\//g, '_')}`,
      'Projects',
      columns,
      processedProjects,
      isPersian
    );
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
            <FolderKanban className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-900">{t.projects}</h2>
            <p className="text-xs text-slate-500 font-b-nazanin mt-0.5">
              {isPersian
                ? 'فهرست پروژه‌ها، تفکیک دسترسی گروه‌ها و محاسبه کل کارکرد ثبت‌شده'
                : 'Project catalog, group access matrix, and accumulated hours'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleExportExcel}
            className="flex items-center gap-1.5 px-3 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-semibold rounded-lg border border-emerald-200 transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            <span>{t.exportExcel}</span>
          </button>

          <button
            onClick={handleExportPdf}
            className="flex items-center gap-1.5 px-3 py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-semibold rounded-lg border border-blue-200 transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            <span>{t.exportPdf}</span>
          </button>

          {canManageProjects && (
            <button
              onClick={handleOpenAdd}
              className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg shadow-xs transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>{isPersian ? 'تعریف پروژه جدید' : 'New Project'}</span>
            </button>
          )}
        </div>
      </div>

      {/* Filters Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 shrink-0">
          <Filter className="w-4 h-4 text-slate-400" />
          <span>{t.filter}:</span>
        </div>

        <div className="w-48">
          <PersianDatePicker
            value={filterStartDate}
            onChange={setFilterStartDate}
            label={isPersian ? 'محاسبه کارکرد از تاریخ' : 'Hours From Date'}
            isPersian={isPersian}
          />
        </div>

        <div className="w-48">
          <PersianDatePicker
            value={filterEndDate}
            onChange={setFilterEndDate}
            label={isPersian ? 'تا تاریخ' : 'To Date'}
            isPersian={isPersian}
          />
        </div>

        <div className="w-48">
          <label className="block text-xs font-medium text-slate-700 mb-1">
            {t.groupsCol}
          </label>
          <select
            value={filterGroupId}
            onChange={e => setFilterGroupId(e.target.value)}
            className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs focus:outline-hidden"
          >
            <option value="all">{isPersian ? 'همه گروه‌ها' : 'All Groups'}</option>
            {allGroups.map(g => (
              <option key={g.id} value={g.id}>
                {g.name}
              </option>
            ))}
          </select>
        </div>

        <div className="w-36">
          <label className="block text-xs font-medium text-slate-700 mb-1">
            {t.statusCol}
          </label>
          <select
            value={filterStatus}
            onChange={e => setFilterStatus(e.target.value)}
            className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs focus:outline-hidden"
          >
            <option value="all">{isPersian ? 'همه وضعیت‌ها' : 'All Statuses'}</option>
            <option value="active">{t.activeStatus}</option>
            <option value="inactive">{t.inactiveStatus}</option>
          </select>
        </div>

        <div className="w-52">
          <label className="block text-xs font-medium text-slate-700 mb-1">
            {isPersian ? 'جستجو در عنوان یا شرح' : 'Search Projects'}
          </label>
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder={isPersian ? 'نام پروژه...' : 'Search...'}
            className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs focus:outline-hidden"
          />
        </div>

        {(filterStartDate || filterEndDate || searchQuery || filterGroupId !== 'all' || filterStatus !== 'all') && (
          <button
            onClick={() => {
              setFilterStartDate('');
              setFilterEndDate('');
              setSearchQuery('');
              setFilterGroupId('all');
              setFilterStatus('all');
            }}
            className="mt-5 px-3 py-1.5 text-xs text-rose-600 hover:bg-rose-50 rounded-lg border border-rose-200 flex items-center gap-1 transition-colors cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
            <span>{t.clearFilter}</span>
          </button>
        )}
      </div>

      {/* Projects Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-right">
            <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200 select-none">
              <tr>
                <th className="p-3 w-10 text-center">#</th>
                <th
                  onClick={() => toggleSort('title')}
                  className="p-3 cursor-pointer hover:bg-slate-100 transition-colors"
                >
                  <div className="flex items-center gap-1">
                    <span>{t.projectCol}</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
                <th
                  onClick={() => toggleSort('groups')}
                  className="p-3 cursor-pointer hover:bg-slate-100 transition-colors"
                >
                  <div className="flex items-center gap-1">
                    <span>{t.groupsCol}</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
                <th
                  onClick={() => toggleSort('status')}
                  className="p-3 cursor-pointer hover:bg-slate-100 transition-colors"
                >
                  <div className="flex items-center gap-1">
                    <span>{t.statusCol}</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
                <th
                  onClick={() => toggleSort('hours')}
                  className="p-3 cursor-pointer hover:bg-slate-100 transition-colors"
                >
                  <div className="flex items-center gap-1">
                    <span>{isPersian ? 'مجموع کارکرد روی پروژه' : 'Logged Work Hours'}</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
                <th
                  onClick={() => toggleSort('notes')}
                  className="p-3 cursor-pointer hover:bg-slate-100 transition-colors"
                >
                  <div className="flex items-center gap-1">
                    <span>{t.notesCol}</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
                {canManageProjects && <th className="p-3 text-center">{t.actionsCol}</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-b-nazanin">
              {processedProjects.map((prj, idx) => {
                const assignedGroupNames = prj.groupIds
                  .map(gid => allGroups.find(g => g.id === gid)?.name)
                  .filter(Boolean);

                return (
                  <tr key={prj.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="p-3 text-center text-slate-400">{idx + 1}</td>
                    <td className="p-3 font-bold text-slate-900 text-sm">
                      {prj.title}
                    </td>
                    <td className="p-3">
                      <div className="flex flex-wrap gap-1">
                        {assignedGroupNames.map((gn, gIdx) => (
                          <span
                            key={gIdx}
                            className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 text-[10px] font-semibold"
                          >
                            {gn}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="p-3">
                      {prj.isActive ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 font-semibold text-[11px]">
                          <CheckCircle2 className="w-3 h-3" />
                          <span>{t.activeStatus}</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-100 text-slate-500 font-bold text-[11px]">
                          <XCircle className="w-3 h-3" />
                          <span>{t.inactiveStatus}</span>
                        </span>
                      )}
                    </td>
                    <td className="p-3 font-bold text-slate-900 text-sm">
                      {formatMinutes(prj.calculatedMinutes, isPersian)}
                    </td>
                    <td className="p-3 text-slate-500 max-w-sm truncate">
                      {prj.description || '-'}
                    </td>
                    {canManageProjects && (
                      <td className="p-3 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => handleOpenEdit(prj)}
                            className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                            title={t.edit}
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => setDeleteTargetId(prj.id)}
                            className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                            title={t.delete}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                );
              })}

              {processedProjects.length === 0 && (
                <tr>
                  <td colSpan={canManageProjects ? 7 : 6} className="p-8 text-center text-slate-400">
                    {isPersian ? 'پروژه‌ای برای نمایش وجود ندارد.' : 'No projects found.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit Project Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-200 p-6 text-slate-800">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <h3 className="text-base font-bold text-slate-900">
                {editingProject
                  ? (isPersian ? 'ویرایش پروژه' : 'Edit Project')
                  : (isPersian ? 'تعریف پروژه جدید' : 'Create New Project')}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {formError && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg">
                {formError}
              </div>
            )}

            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  {isPersian ? 'عنوان پروژه' : 'Project Title'} <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formTitle}
                  onChange={e => setFormTitle(e.target.value)}
                  placeholder={isPersian ? 'مثال: سامانه اتوماسیون جامع...' : 'e.g. Enterprise ERP'}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  {t.groupsCol} <span className="text-red-500">*</span>
                </label>
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg max-h-36 overflow-y-auto space-y-2">
                  {allGroups.map(g => {
                    const checked = formGroupIds.includes(g.id);
                    return (
                      <label key={g.id} className="flex items-center gap-2 text-xs cursor-pointer">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={e => {
                            if (e.target.checked) {
                              setFormGroupIds([...formGroupIds, g.id]);
                            } else {
                              setFormGroupIds(formGroupIds.filter(id => id !== g.id));
                            }
                          }}
                          className="rounded text-blue-600"
                        />
                        <span className="font-semibold text-slate-800">{g.name}</span>
                        {g.description && (
                          <span className="text-[10px] text-slate-400">({g.description})</span>
                        )}
                      </label>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  {isPersian ? 'توضیحات اختیاری' : 'Optional Description'}
                </label>
                <textarea
                  rows={3}
                  value={formDescription}
                  onChange={e => setFormDescription(e.target.value)}
                  placeholder={isPersian ? 'اهداف، فازبندی، یا توضیحات پروژه...' : 'Project scope or description...'}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                />
              </div>

              {/* Status active/inactive */}
              <div className="flex items-center gap-3 pt-2">
                <input
                  type="checkbox"
                  id="projectActive"
                  checked={formIsActive}
                  onChange={e => setFormIsActive(e.target.checked)}
                  className="rounded text-blue-600 w-4 h-4 cursor-pointer"
                />
                <label htmlFor="projectActive" className="text-xs font-semibold text-slate-800 cursor-pointer">
                  {isPersian ? 'پروژه فعال است (امکان ثبت ساعت جدید)' : 'Project is active (allows logging work hours)'}
                </label>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
                >
                  {t.cancel}
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-xs transition-colors"
                >
                  {t.save}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={Boolean(deleteTargetId)}
        title={t.deleteConfirmTitle}
        message={t.deleteConfirmDesc}
        confirmText={t.delete}
        cancelText={t.cancel}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTargetId(null)}
      />
    </div>
  );
};
