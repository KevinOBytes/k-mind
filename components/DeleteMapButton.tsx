'use client';

import React, { useTransition } from 'react';
import { deleteMindmap } from '@/app/actions/mindmaps';

interface DeleteMapButtonProps {
  id: string;
}

export default function DeleteMapButton({ id }: DeleteMapButtonProps) {
  const [isPending, startTransition] = useTransition();

  const handleDelete = async (e: React.FormEvent) => {
    e.preventDefault();
    if (confirm('Are you sure you want to delete this mind map?')) {
      startTransition(async () => {
        await deleteMindmap(id);
      });
    }
  };

  return (
    <form onSubmit={handleDelete}>
      <button 
        type="submit" 
        disabled={isPending}
        className="border border-slate-200 hover:bg-red-50 hover:text-red-600 text-slate-400 p-2 rounded-lg transition disabled:opacity-50"
        title="Delete Mind Map"
      >
        {isPending ? '...' : '🗑️'}
      </button>
    </form>
  );
}
