import Link from 'next/link';

export default function Home() {
  return (
    <div className="min-h-screen bg-[#1F2836] flex items-center justify-center p-8">
      <div className="max-w-4xl w-full">
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold text-[#FFFFFF] mb-4">
            ERP Gestion de Projet
          </h1>
          <p className="text-xl text-[#FFFFFF]">
            Solution de gestion pour la fonction publique territoriale
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          <Link href="/clients">
            <div className="bg-[#2E3744] rounded-lg p-8 hover:border-[#2196F3] transition-all cursor-pointer border-2 border-[#FFFFFF26]">
              <div className="text-4xl mb-4">👥</div>
              <h2 className="text-2xl font-bold mb-3 text-[#FFFFFF]">
                Gestion des Clients
              </h2>
              <p className="text-[#FFFFFF]">
                Créer, consulter et gérer les fiches clients et leurs contacts
              </p>
            </div>
          </Link>

          <Link href="/commandes/nouvelle">
            <div className="bg-[#2E3744] rounded-lg p-8 hover:border-[#2196F3] transition-all cursor-pointer border-2 border-[#FFFFFF26]">
              <div className="text-4xl mb-4">📝</div>
              <h2 className="text-2xl font-bold mb-3 text-[#FFFFFF]">
                Nouvelle Commande
              </h2>
              <p className="text-[#FFFFFF]">
                Créer une nouvelle commande avec prestations et la transformer automatiquement en projet
              </p>
            </div>
          </Link>

          <Link href="/bannette">
            <div className="bg-[#2E3744] rounded-lg p-8 hover:border-[#2196F3] transition-all cursor-pointer border-2 border-[#FFFFFF26]">
              <div className="text-4xl mb-4">📋</div>
              <h2 className="text-2xl font-bold mb-3 text-[#FFFFFF]">
                Bannette d'affectation
              </h2>
              <p className="text-[#FFFFFF]">
                Affecter les projets en attente aux directeurs de projet disponibles
              </p>
            </div>
          </Link>

          <Link href="/projets">
            <div className="bg-[#2E3744] rounded-lg p-8 hover:border-[#2196F3] transition-all cursor-pointer border-2 border-[#FFFFFF26]">
              <div className="text-4xl mb-4">🎯</div>
              <h2 className="text-2xl font-bold mb-3 text-[#FFFFFF]">
                Mes Projets
              </h2>
              <p className="text-[#FFFFFF]">
                Dashboard et suivi de mes projets affectés (à venir)
              </p>
            </div>
          </Link>

          <Link href="/dashboard">
            <div className="bg-[#2E3744] rounded-lg p-8 hover:border-[#2196F3] transition-all cursor-pointer border-2 border-[#FFFFFF26]">
              <div className="text-4xl mb-4">📊</div>
              <h2 className="text-2xl font-bold mb-3 text-[#FFFFFF]">
                Tableau de bord
              </h2>
              <p className="text-[#FFFFFF]">
                Vue d'ensemble des projets, statistiques et indicateurs (à venir)
              </p>
            </div>
          </Link>
        </div>

        <div className="mt-12 text-center">
          <div className="inline-block bg-[#2E3744] rounded-lg border border-[#FFFFFF26] px-6 py-4">
            <p className="text-sm text-[#FFFFFF]">
              <strong>Version prototype v0.1</strong> - Axe 1 : Transformation commande et affectation projet
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}