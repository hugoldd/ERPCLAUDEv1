'use client';

import Link from 'next/link';
import { useTheme } from '@/context/ThemeContext';

export default function GestionProjetHomePage() {
  const { colors } = useTheme();

  const Card = ({
    href,
    icon,
    title,
    desc,
  }: {
    href: string;
    icon: string;
    title: string;
    desc: string;
  }) => (
    <Link
      href={href}
      className="rounded-xl border p-4 transition-colors"
      style={{ backgroundColor: colors.card, borderColor: colors.border, color: colors.text }}
    >
      <div className="text-lg">{icon}</div>
      <div className="mt-1 font-medium">{title}</div>
      <div className="text-sm" style={{ color: colors.textSecondary }}>
        {desc}
      </div>
    </Link>
  );

  return (
    <div className="rounded-xl border p-6" style={{ backgroundColor: colors.card, borderColor: colors.border, color: colors.text }}>
      <h1 className="text-xl font-semibold">Gestion de Réservation des Projets</h1>
      <p className="mt-2 text-sm" style={{ color: colors.textSecondary }}>
        Mise en œuvre conforme au README : planning, gestion des réservations, disponibilités, jalons, conflits, reporting.
      </p>

      <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Card href="/gestion-projet/reservations" icon="📅" title="Réservations" desc="Créer / modifier / annuler (avec motif)" />
        <Card href="/gestion-projet/disponibilites" icon="🗓️" title="Disponibilités" desc="Congés, formation, inter-contrat…" />
        <Card href="/gestion-projet/jalons" icon="🏁" title="Jalons" desc="Jalons, phases, livrables" />
        <Card href="/gestion-projet/dashboard" icon="📊" title="Dashboard" desc="KPIs + conflits (sur-allocation, budget…)" />
      </div>
    </div>
  );
}
