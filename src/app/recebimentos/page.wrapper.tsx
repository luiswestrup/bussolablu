"use client";

import React from 'react';
import RecebimentosPage from '@/app/recebimentos/page';
import ProtectedRoute from '@/components/ProtectedRoute';

export default function RecebimentosWrapper() {
  return (
    <ProtectedRoute allowed={['admin','financeiro']}>
      <RecebimentosPage />
    </ProtectedRoute>
  );
}
