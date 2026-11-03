import React, { useState } from 'react';
import {
  X,
  MessageCircle,
  Phone,
  MapPin,
  Clock,
  ShieldCheck,
  Truck,
  CheckCircle2,
  AlertTriangle,
  User,
  Save,
  Send,
} from 'lucide-react';
import { Order, OrderStatus } from '../../types';
import { normalizeWhatsAppNumber } from '../../utils/whatsapp';

interface AdminOrderDetailsModalProps {
  order: Order | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdateStatus: (orderId: string, status: OrderStatus) => Promise<void>;
  onUpdateCustomer: (
    orderId: string,
    customerData: {
      customer_name: string;
      customer_phone: string;
      city: string;
      address: string;
      notes?: string;
    }
  ) => Promise<void>;
}

export const AdminOrderDetailsModal: React.FC<AdminOrderDetailsModalProps> = ({
  order,
  isOpen,
  onClose,
  onUpdateStatus,
  onUpdateCustomer,
}) => {
  if (!isOpen || !order) return null;

  const [currentStatus, setCurrentStatus] = useState<OrderStatus>(order.status);
  const [isEditingCustomer, setIsEditingCustomer] = useState(false);
  const [customerName, setCustomerName] = useState(order.customer_name);
  const [customerPhone, setCustomerPhone] = useState(order.customer_phone);
  const [city, setCity] = useState(order.city);
  const [address, setAddress] = useState(order.address);
  const [notes, setNotes] = useState(order.notes || '');

  const [isUpdating, setIsUpdating] = useState(false);

  const cleanCustomerPhone = normalizeWhatsAppNumber(order.customer_phone);

  const handleStatusChange = async (newStat: OrderStatus) => {
    setIsUpdating(true);
    try {
      await onUpdateStatus(order.id, newStat);
      setCurrentStatus(newStat);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleSaveCustomer = async () => {
    setIsUpdating(true);
    try {
      await onUpdateCustomer(order.id, {
        customer_name: customerName,
        customer_phone: customerPhone,
        city,
        address,
        notes,
      });
      setIsEditingCustomer(false);
    } finally {
      setIsUpdating(false);
    }
  };

  const getStatusBadge = (status: OrderStatus) => {
    switch (status) {
      case 'Pending WhatsApp Confirmation':
        return 'bg-amber-100 text-amber-900 border-amber-300';
      case 'Confirmed':
        return 'bg-blue-100 text-blue-900 border-blue-300';
      case 'Preparing':
        return 'bg-purple-100 text-purple-900 border-purple-300';
      case 'Shipped':
        return 'bg-indigo-100 text-indigo-900 border-indigo-300';
      case 'Delivered':
        return 'bg-emerald-100 text-emerald-900 border-emerald-300';
      case 'Cancelled':
        return 'bg-rose-100 text-rose-900 border-rose-300';
    }
  };

  // WhatsApp quick ping text to customer
  const directCustomerWhatsAppMsg = encodeURIComponent(
    `Bonjour ${order.customer_name}, c'est DoArt Store concernant votre commande #${order.order_reference} pour un montant de ${order.total} DH avec paiement à la livraison à ${order.city}. Nous préparons l'expédition !`
  );

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-3xl shadow-2xl rounded-xs border border-[#F1D7C5] overflow-hidden my-6">
        {/* Header */}
        <div className="bg-[#FAF4EF] px-6 py-5 border-b border-[#F1D7C5] flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3">
              <span className="font-mono text-base font-bold text-[#181818]">
                #{order.order_reference}
              </span>
              <span
                className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${getStatusBadge(
                  currentStatus
                )}`}
              >
                {currentStatus}
              </span>
            </div>
            <p className="text-xs text-gray-500 mt-1 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-gray-400" />
              <span>
                Commande passée le {new Date(order.created_at).toLocaleString('fr-FR')}
              </span>
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-black rounded-full hover:bg-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 md:p-8 space-y-6 max-h-[75vh] overflow-y-auto">
          {/* Status Quick Changer */}
          <div className="bg-gray-50 p-4 border border-gray-200 rounded-xs space-y-2">
            <label className="text-xs font-bold uppercase tracking-wider text-gray-700 block">
              Modifier le statut de la commande :
            </label>
            <div className="flex flex-wrap gap-2">
              {(
                [
                  'Pending WhatsApp Confirmation',
                  'Confirmed',
                  'Preparing',
                  'Shipped',
                  'Delivered',
                  'Cancelled',
                ] as OrderStatus[]
              ).map((st) => (
                <button
                  key={st}
                  disabled={isUpdating}
                  onClick={() => handleStatusChange(st)}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-xs border transition-colors ${
                    currentStatus === st
                      ? 'bg-[#181818] text-white border-[#181818]'
                      : 'bg-white hover:bg-gray-100 text-gray-700 border-gray-300'
                  }`}
                >
                  {st}
                </button>
              ))}
            </div>

            {currentStatus === 'Cancelled' && (
              <p className="text-[11px] text-rose-700 flex items-center gap-1.5 pt-1 font-medium">
                <AlertTriangle className="w-3.5 h-3.5" />
                <span>Statut Annulé : le stock des variantes réservées a été automatiquement réintégré.</span>
              </p>
            )}
          </div>

          {/* Customer Information Card */}
          <div className="border border-gray-200 p-5 rounded-xs space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs uppercase tracking-wider font-bold text-gray-900 flex items-center gap-2">
                <User className="w-4 h-4 text-[#CF7644]" />
                <span>Coordonnées du Client & Livraison</span>
              </h4>
              <button
                type="button"
                onClick={() => setIsEditingCustomer(!isEditingCustomer)}
                className="text-xs text-[#CF7644] hover:underline font-semibold"
              >
                {isEditingCustomer ? 'Annuler' : 'Modifier les coordonnées'}
              </button>
            </div>

            {isEditingCustomer ? (
              <div className="space-y-3 pt-2">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] text-gray-600 block">Nom & Prénom</label>
                    <input
                      type="text"
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      className="w-full px-2.5 py-1.5 text-xs border border-gray-300 rounded-xs"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-gray-600 block">Téléphone</label>
                    <input
                      type="text"
                      value={customerPhone}
                      onChange={(e) => setCustomerPhone(e.target.value)}
                      className="w-full px-2.5 py-1.5 text-xs border border-gray-300 rounded-xs"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] text-gray-600 block">Ville</label>
                    <input
                      type="text"
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      className="w-full px-2.5 py-1.5 text-xs border border-gray-300 rounded-xs"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-gray-600 block">Adresse complète</label>
                    <input
                      type="text"
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      className="w-full px-2.5 py-1.5 text-xs border border-gray-300 rounded-xs"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[11px] text-gray-600 block">Notes du client</label>
                  <input
                    type="text"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="w-full px-2.5 py-1.5 text-xs border border-gray-300 rounded-xs"
                  />
                </div>

                <button
                  type="button"
                  onClick={handleSaveCustomer}
                  className="bg-[#CF7644] text-white px-4 py-2 text-xs font-semibold uppercase rounded-xs hover:bg-[#b66133] flex items-center gap-1.5"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>Enregistrer les coordonnées</span>
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div className="space-y-1">
                  <p className="text-gray-500">Nom du client :</p>
                  <p className="font-bold text-gray-900 text-sm">{order.customer_name}</p>
                  <div className="pt-2 flex items-center gap-2">
                    <span className="text-gray-600 font-mono">{order.customer_phone}</span>
                    <a
                      href={`https://wa.me/${cleanCustomerPhone}?text=${directCustomerWhatsAppMsg}`}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 bg-[#25D366] text-white px-2.5 py-1 rounded-xs font-bold text-[11px] hover:bg-[#20ba5a] transition-colors"
                      title="Contacter le client sur WhatsApp"
                    >
                      <MessageCircle className="w-3 h-3" />
                      <span>WhatsApp</span>
                    </a>
                  </div>
                </div>

                <div className="space-y-1">
                  <p className="text-gray-500">Adresse de livraison (Maroc) :</p>
                  <p className="font-bold text-gray-900">
                    {order.city}
                  </p>
                  <p className="text-gray-700">{order.address}</p>
                  {order.notes && (
                    <p className="text-[11px] text-gray-500 italic pt-1">
                      Note client : « {order.notes} »
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Ordered Items Table */}
          <div className="space-y-3">
            <h4 className="text-xs uppercase tracking-wider font-bold text-gray-900">
              Articles commandés ({order.items?.length || 0})
            </h4>

            <div className="border border-gray-200 overflow-x-auto rounded-xs">
              <table className="min-w-full divide-y divide-gray-200 text-xs">
                <thead className="bg-[#FAF4EF]">
                  <tr>
                    <th className="px-4 py-2.5 text-left font-bold text-gray-700 uppercase">Article</th>
                    <th className="px-4 py-2.5 text-left font-bold text-gray-700 uppercase">Taille</th>
                    <th className="px-4 py-2.5 text-left font-bold text-gray-700 uppercase">Couleur</th>
                    <th className="px-4 py-2.5 text-center font-bold text-gray-700 uppercase">Quantité</th>
                    <th className="px-4 py-2.5 text-right font-bold text-gray-700 uppercase">Prix Unit.</th>
                    <th className="px-4 py-2.5 text-right font-bold text-gray-700 uppercase">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 bg-white">
                  {(order.items || []).map((it) => (
                    <tr key={it.id}>
                      <td className="px-4 py-3 font-semibold text-gray-900">
                        {it.product_name}
                      </td>
                      <td className="px-4 py-3 font-bold text-gray-700">{it.size}</td>
                      <td className="px-4 py-3 text-gray-700">{it.color_name}</td>
                      <td className="px-4 py-3 text-center font-bold text-gray-900">{it.quantity}</td>
                      <td className="px-4 py-3 text-right text-gray-600">{it.unit_price} DH</td>
                      <td className="px-4 py-3 text-right font-bold text-[#181818]">{it.total_price} DH</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Total Footer */}
            <div className="bg-[#FAF4EF] p-4 rounded-xs border border-[#F1D7C5] flex flex-col sm:flex-row items-center justify-between text-xs gap-3">
              <div className="flex items-center gap-2 text-emerald-800 font-semibold">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <span>Paiement à la livraison (En espèces au livreur)</span>
              </div>
              <div className="text-right space-y-0.5">
                <p className="text-gray-500">Sous-total : {order.subtotal} DH</p>
                <p className="text-base font-bold text-[#181818]">
                  Montant Total à Encaisser : <span className="text-[#CF7644] font-serif text-lg">{order.total} DH</span>
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="bg-gray-50 px-6 py-4 border-t border-gray-200 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 text-xs font-semibold uppercase tracking-wider text-gray-700 hover:text-black border border-gray-300 rounded-xs bg-white hover:bg-gray-100 transition-colors"
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
};
