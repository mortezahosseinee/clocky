import React, { useState } from 'react';
import { User, Group } from '../types';
import { translations, Language } from '../utils/translations';
import { StorageService } from '../utils/storage';
import { getTodayJalali } from '../utils/jalali';
import { ConfirmModal } from '../components/ConfirmModal';
import {
  Layers,
  Plus,
  Edit2,
  Trash2,
  Users,
  Check,
  FolderKanban,
  X
} from 'lucide-react';

interface GroupsViewProps {
  user: User;
  lang: Language;
}

export const GroupsView: React.FC<GroupsViewProps> = ({ user, lang }) => {
  const t = translations[lang];
  const isPersian = lang === 'fa';

  const [groups, setGroups] = useState<Group[]>(() => StorageService.getGroups());
  const allUsers = StorageService.getUsers(false);
  const allProjects = StorageService.getProjects();

  const [searchQuery, setSearchQuery] = useState('');
  const [sortField, setSortField] = useState<'name' | 'members' | 'date'>('name');
  const [sortAsc, setSortAsc] = useState(true);

  // Add / Edit Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingGroup, setEditingGroup] = useState<Group | null>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [memberUserIds, setMemberUserIds] = useState<string[]>([]);
  const [formError, setFormError] = useState<string | null>(null);

  // Delete Confirm
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);

  const reload = () => {
    setGroups(StorageService.getGroups());
  };

  const handleOpenAdd = () => {
    setEditingGroup(null);
    setName('');
    setDescription('');
    setMemberUserIds([]);
    setFormError(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (g: Group) => {
    setEditingGroup(g);
    setName(g.name);
    setDescription(g.description || '');
    setMemberUserIds(g.memberUserIds || []);
    setFormError(null);
    setIsModalOpen(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setFormError(isPersian ? 'عنوان گروه اجباری است.' : 'Group title is required.');
      return;
    }

    const grp: Group = {
      id: editingGroup ? editingGroup.id : `grp-${Date.now()}`,
      name: name.trim(),
      description: description.trim() || undefined,
      memberUserIds,
      createdAt: editingGroup ? editingGroup.createdAt : getTodayJalali()
    };

    StorageService.saveGroup(grp);

    // Sync user records with this group
    const users = StorageService.getUsers(true);
    users.forEach(u => {
      const isMember = memberUserIds.includes(u.id);
      const currentlyHas = u.groupIds.includes(grp.id);
      if (isMember && !currentlyHas) {
        u.groupIds.push(grp.id);
        StorageService.saveUser(u);
      } else if (!isMember && currentlyHas) {
        u.groupIds = u.groupIds.filter(id => id !== grp.id);
        StorageService.saveUser(u);
      }
    });

    StorageService.addLog(
      editingGroup ? 'UPDATE_GROUP' : 'CREATE_GROUP',
      `گروه سازمانی "${grp.name}" ${editingGroup ? 'ویرایش' : 'تعریف'} گردید.`
    );

    setIsModalOpen(false);
    reload();
  };

  const handleDelete = () => {
    if (deleteTargetId) {
      StorageService.deleteGroup(deleteTargetId);
      setDeleteTargetId(null);
      reload();
    }
  };

  const filteredAndSortedGroups = groups
    .filter(g => {
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const matchName = g.name.toLowerCase().includes(q);
        const matchDesc = (g.description || '').toLowerCase().includes(q);
        if (!matchName && !matchDesc) return false;
      }
      return true;
    })
    .sort((a, b) => {
      let diff = 0;
      if (sortField === 'name') diff = a.name.localeCompare(b.name);
      else if (sortField === 'members') diff = (a.memberUserIds || []).length - (b.memberUserIds || []).length;
      else if (sortField === 'date') diff = a.createdAt.localeCompare(b.createdAt);
      return sortAsc ? diff : -diff;
    });

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-900">{t.groupManagement}</h2>
            <p className="text-xs text-slate-500 font-b-nazanin mt-0.5">
              {isPersian
                ? 'تفکیک دسترسی پرسنل و پروژه‌ها بر اساس گروه‌های کاری سازمانی'
                : 'Group definitions for project allocation and access control'}
            </p>
          </div>
        </div>

        <button
          onClick={handleOpenAdd}
          className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs rounded-xl shadow-xs transition-colors cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>{isPersian ? 'تعریف گروه جدید' : 'New Group'}</span>
        </button>
      </div>

      {/* Filter and Sort Toolbar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div className="w-64">
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder={isPersian ? 'جستجو در نام یا شرح گروه...' : 'Search groups...'}
            className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs focus:outline-hidden"
          />
        </div>

        <div className="flex items-center gap-2 text-xs">
          <span className="text-slate-400 font-semibold">{t.filter}:</span>
          <button
            onClick={() => {
              if (sortField === 'name') setSortAsc(!sortAsc);
              else { setSortField('name'); setSortAsc(true); }
            }}
            className={`px-2.5 py-1.5 rounded-lg cursor-pointer ${sortField === 'name' ? 'bg-blue-50 text-blue-700 font-bold' : 'text-slate-600 hover:bg-slate-100'}`}
          >
            {isPersian ? 'نام گروه' : 'Name'}
          </button>
          <button
            onClick={() => {
              if (sortField === 'members') setSortAsc(!sortAsc);
              else { setSortField('members'); setSortAsc(false); }
            }}
            className={`px-2.5 py-1.5 rounded-lg cursor-pointer ${sortField === 'members' ? 'bg-blue-50 text-blue-700 font-bold' : 'text-slate-600 hover:bg-slate-100'}`}
          >
            {isPersian ? 'تعداد اعضا' : 'Members'}
          </button>
          <button
            onClick={() => {
              if (sortField === 'date') setSortAsc(!sortAsc);
              else { setSortField('date'); setSortAsc(false); }
            }}
            className={`px-2.5 py-1.5 rounded-lg cursor-pointer ${sortField === 'date' ? 'bg-blue-50 text-blue-700 font-bold' : 'text-slate-600 hover:bg-slate-100'}`}
          >
            {isPersian ? 'تاریخ ایجاد' : 'Date'}
          </button>
        </div>
      </div>

      {/* Groups Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredAndSortedGroups.map(grp => {
          const members = allUsers.filter(u => (grp.memberUserIds || []).includes(u.id) || u.groupIds.includes(grp.id));
          const associatedProjects = allProjects.filter(p => p.groupIds.includes(grp.id));

          return (
            <div
              key={grp.id}
              className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between hover:border-slate-300 transition-all"
            >
              <div className="space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-bold text-base text-slate-900">{grp.name}</h3>
                    <p className="text-xs text-slate-500 font-b-nazanin mt-1">
                      {grp.description || (isPersian ? 'بدون شرح اختیاری' : 'No description')}
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleOpenEdit(grp)}
                      className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => setDeleteTargetId(grp.id)}
                      className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Assigned Projects */}
                <div className="pt-2 border-t border-slate-100">
                  <div className="text-[11px] font-bold text-slate-500 mb-1 flex items-center gap-1">
                    <FolderKanban className="w-3.5 h-3.5 text-slate-400" />
                    <span>{isPersian ? 'پروژه‌های متصل به گروه:' : 'Connected Projects:'}</span>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {associatedProjects.map(p => (
                      <span key={p.id} className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 text-[10px] font-semibold">
                        {p.title}
                      </span>
                    ))}
                    {associatedProjects.length === 0 && (
                      <span className="text-[11px] text-slate-400 font-b-nazanin">
                        {isPersian ? 'پروژه‌ای اختصاص نیافته' : 'No projects'}
                      </span>
                    )}
                  </div>
                </div>

                {/* Members */}
                <div className="pt-2 border-t border-slate-100">
                  <div className="text-[11px] font-bold text-slate-500 mb-1 flex items-center gap-1">
                    <Users className="w-3.5 h-3.5 text-slate-400" />
                    <span>{isPersian ? 'اعضای عضو گروه:' : 'Members:'} ({members.length})</span>
                  </div>
                  <div className="flex flex-wrap gap-1 max-h-24 overflow-y-auto">
                    {members.map(m => (
                      <span key={m.id} className="px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 text-[10px] font-semibold">
                        {m.firstName} {m.lastName}
                      </span>
                    ))}
                    {members.length === 0 && (
                      <span className="text-[11px] text-slate-400 font-b-nazanin">
                        {isPersian ? 'عضوی افزوده نشده است' : 'No members'}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100 text-[11px] text-slate-400 font-b-nazanin flex justify-between">
                <span>{isPersian ? 'تاریخ ایجاد:' : 'Created:'} {grp.createdAt}</span>
              </div>
            </div>
          );
        })}

        {groups.length === 0 && (
          <div className="col-span-3 p-12 text-center text-slate-400 text-xs">
            {isPersian ? 'هیچ گروهی تعریف نشده است.' : 'No groups defined yet.'}
          </div>
        )}
      </div>

      {/* Add / Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-200 p-6 text-slate-800">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <h3 className="text-base font-bold text-slate-900">
                {editingGroup
                  ? (isPersian ? 'ویرایش گروه سازمانی' : 'Edit Group')
                  : (isPersian ? 'تعریف گروه جدید' : 'New Group')}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600 p-1">
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
                  {isPersian ? 'عنوان گروه' : 'Group Name'} <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder={isPersian ? 'مثال: تیم فنی و مهندسی...' : 'e.g. Engineering Team'}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  {isPersian ? 'شرح یا ماموریت گروه' : 'Description'}
                </label>
                <textarea
                  rows={2}
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  placeholder={isPersian ? 'توضیحات اختیاری...' : 'Optional description...'}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  {isPersian ? 'انتخاب اعضای گروه' : 'Assign Members'}
                </label>
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg max-h-48 overflow-y-auto space-y-1.5">
                  {allUsers.map(u => {
                    const checked = memberUserIds.includes(u.id);
                    return (
                      <label key={u.id} className="flex items-center justify-between text-xs cursor-pointer p-1.5 hover:bg-slate-100 rounded-md">
                        <div className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={e => {
                              if (e.target.checked) setMemberUserIds([...memberUserIds, u.id]);
                              else setMemberUserIds(memberUserIds.filter(id => id !== u.id));
                            }}
                            className="rounded text-blue-600"
                          />
                          <span className="font-semibold text-slate-800">{u.firstName} {u.lastName}</span>
                        </div>
                        <span className="text-[10px] text-slate-400 font-b-nazanin">
                          {u.jobTitle || u.role}
                        </span>
                      </label>
                    );
                  })}
                </div>
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

      {/* Delete Confirm */}
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
