import { X } from 'lucide-react';

interface ImageModalProps {
  imageUrl: string;
  onClose: () => void;
}

export function ImageModal({ imageUrl, onClose }: ImageModalProps) {
  return (
    // Backdrop
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 transition-opacity duration-300"
    >
      {/* Modal İçeriği */}
      <div
        onClick={(e) => e.stopPropagation()} // Tıklamanın backdrop'a gitmesini engelle
        className="relative max-w-4xl max-h-[90vh] bg-white rounded-lg shadow-xl"
      >
        <img
          src={imageUrl}
          alt="Büyük ürün görseli"
          className="object-contain w-full h-auto max-h-[90vh] rounded-lg"
        />
        {/* Kapat Düğmesi */}
        <button
          onClick={onClose}
          className="absolute -top-4 -right-4 z-10 p-2 bg-white rounded-full text-gray-700 hover:bg-gray-200 transition-colors shadow-lg"
          title="Kapat"
        >
          <X className="w-6 h-6" />
        </button>
      </div>
    </div>
  );
}
