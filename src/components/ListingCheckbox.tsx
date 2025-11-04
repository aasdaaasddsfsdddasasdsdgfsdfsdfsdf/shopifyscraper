import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { Loader2 } from 'lucide-react';

interface ListingCheckboxProps {
  rowId: string;
  initialValue: boolean;
  currentUser: string;
}

export function ListingCheckbox({ rowId, initialValue, currentUser }: ListingCheckboxProps) {
  const [isChecked, setIsChecked] = useState(initialValue);
  const [isLoading, setIsLoading] = useState(false);

  const handleChange = async () => {
    // Eğer bir kullanıcı seçilmemişse işlemi engelle
    if (!currentUser) {
      alert('Lütfen işlem yapmadan önce "İnceleyen Kişi" seçimi yapın.');
      return;
    }
    
    setIsLoading(true);
    const newValue = !isChecked;

    // Önce arayüzü anında güncelle (Optimistic UI)
    setIsChecked(newValue);

    // Veritabanını güncelle
    const { error } = await supabase
      .from('scraped_data')
      .update({
        listedurum: newValue,
        inceleyen: currentUser // İsteğinizin kilit noktası: "inceleyen" alanı da güncelleniyor
      })
      .eq('id', rowId);

    // Hata olursa
    if (error) {
      console.error('Update error:', error);
      // Arayüzü eski haline getir
      setIsChecked(!newValue);
      alert(`Hata: ${error.message}`);
    }
    
    setIsLoading(false);
  };

  return (
    <div className="flex items-center justify-center">
      {isLoading ? (
        <Loader2 className="w-4 h-4 animate-spin text-blue-500" />
      ) : (
        <input
          type="checkbox"
          checked={isChecked}
          onChange={handleChange}
          // Kullanıcı seçili değilse checkbox'ı devre dışı bırak
          disabled={!currentUser} 
          className={`w-5 h-5 rounded text-blue-600 focus:ring-blue-500 ${
            !currentUser ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'
          }`}
          title={!currentUser ? 'İşlem yapmak için inceleyen kişi seçmelisiniz' : (isChecked ? 'Listeden çıkar' : 'Listeye ekle')}
        />
      )}
    </div>
  );
}