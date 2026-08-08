"use client";

import React from 'react';
import RelatoriosPage from '@/app/relatorios/page';
import ProtectedRoute from '@/components/ProtectedRoute';

export default function RelatoriosWrapper() {
  return (
    <ProtectedRoute allowed={['admin','financeiro']}>
      <RelatoriosPage />
    </ProtectedRoute>
  );
}
