import { FormEvent, useState } from 'react';
import { Save, ShieldCheck, Trash2 } from 'lucide-react';
import type { UserRole, UserRoleRecord } from '../types';

type RoleManagerProps = {
  roles: UserRoleRecord[];
  saving: boolean;
  onSave: (record: UserRoleRecord) => Promise<boolean | void> | boolean | void;
  onDelete: (userId: string) => Promise<boolean | void> | boolean | void;
};

const roleOptions: UserRole[] = ['owner', 'admin', 'kasir'];

const emptyDraft = (): UserRoleRecord => ({
  user_id: '',
  role: 'kasir',
  full_name: '',
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
});

export const RoleManager = ({ roles, saving, onSave, onDelete }: RoleManagerProps) => {
  const [draft, setDraft] = useState<UserRoleRecord>(() => emptyDraft());
  const [deletingId, setDeletingId] = useState('');

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!draft.user_id.trim()) return;
    const saved = await onSave({
      ...draft,
      user_id: draft.user_id.trim(),
      full_name: draft.full_name.trim(),
      updated_at: new Date().toISOString(),
    });
    if (saved === false) return;
    setDraft(emptyDraft());
  };

  const remove = async (userId: string) => {
    setDeletingId(userId);
    await onDelete(userId);
    setDeletingId('');
  };

  return (
    <section className="panel p-5">
      <div className="mb-5 flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-normal text-earth-500">Akses User</p>
          <h2 className="text-xl font-black text-earth-900">Manajemen Role</h2>
        </div>
        <ShieldCheck className="text-clay-600" size={22} />
      </div>

      <form className="grid gap-3" onSubmit={submit}>
        <label className="field">
          User ID
          <input
            className="input"
            value={draft.user_id}
            onChange={(event) => setDraft({ ...draft, user_id: event.target.value })}
            placeholder="UUID Supabase Auth"
          />
        </label>
        <div className="grid gap-3 sm:grid-cols-[1fr_150px]">
          <label className="field">
            Nama
            <input
              className="input"
              value={draft.full_name}
              onChange={(event) => setDraft({ ...draft, full_name: event.target.value })}
              placeholder="Nama user"
            />
          </label>
          <label className="field">
            Role
            <select
              className="input"
              value={draft.role}
              onChange={(event) => setDraft({ ...draft, role: event.target.value as UserRole })}
            >
              {roleOptions.map((role) => (
                <option key={role} value={role}>
                  {role}
                </option>
              ))}
            </select>
          </label>
        </div>
        <button className="btn-primary justify-self-start" disabled={saving}>
          <Save size={17} /> {saving ? 'Menyimpan...' : 'Simpan Role'}
        </button>
      </form>

      <div className="mt-5 overflow-hidden rounded-2xl border border-earth-200">
        <table className="w-full min-w-[520px] border-collapse text-sm">
          <thead className="bg-earth-50 text-left text-xs uppercase tracking-normal text-earth-500">
            <tr>
              <th className="p-3">User</th>
              <th className="p-3">Role</th>
              <th className="p-3">Aksi</th>
            </tr>
          </thead>
          <tbody>
            {roles.map((role) => (
              <tr key={role.user_id} className="border-t border-earth-100">
                <td className="p-3">
                  <strong className="block text-earth-900">{role.full_name || 'User'}</strong>
                  <span className="text-xs font-bold text-earth-500">{role.user_id}</span>
                </td>
                <td className="p-3">
                  <span className="rounded-full bg-earth-100 px-3 py-1 text-xs font-black text-earth-700">
                    {role.role}
                  </span>
                </td>
                <td className="p-3">
                  <button
                    className="icon-btn text-red-600"
                    onClick={() => void remove(role.user_id)}
                    disabled={deletingId === role.user_id}
                    title="Hapus role"
                  >
                    <Trash2 size={16} />
                  </button>
                </td>
              </tr>
            ))}
            {!roles.length && (
              <tr>
                <td colSpan={3} className="p-6 text-center font-bold text-earth-500">
                  Belum ada role tersimpan.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
};
