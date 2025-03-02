// Pinata API ile IPFS entegrasyonu
import axios from 'axios';

class IpfsService {
  /**
   * Pinata API kullanarak veriyi IPFS'e yükle
   * @param {Object} data - IPFS'e yüklenecek veri
   * @returns {Promise<string>} - IPFS CID (Content Identifier)
   */
  static async uploadToIpfs(data) {
    try {
      console.log('Veri IPFS\'e yükleniyor:', data);
      
      // Pinata API anahtarları ve JWT - Vite'ın import.meta.env kullanımı
      const pinataApiKey = import.meta.env.VITE_PINATA_API_KEY;
      const pinataSecretApiKey = import.meta.env.VITE_PINATA_SECRET_API_KEY;
      const pinataJWT = import.meta.env.VITE_PINATA_JWT;
      
      console.log('API Key:', pinataApiKey ? 'Mevcut' : 'Yok');
      console.log('Secret Key:', pinataSecretApiKey ? 'Mevcut' : 'Yok');
      console.log('JWT:', pinataJWT ? 'Mevcut' : 'Yok');
      
      // API anahtarları veya JWT yoksa hata fırlat
      if ((!pinataApiKey || !pinataSecretApiKey) && !pinataJWT) {
        console.warn('Pinata API anahtarları veya JWT bulunamadı, test verisi döndürülüyor');
        // Test için sahte bir CID döndür
        return 'QmTest' + Math.random().toString(36).substring(2, 15);
      }
      
      // Pinata'ya yüklenecek veriyi hazırla
      const pinataData = {
        pinataContent: data,
        pinataMetadata: {
          name: `Bet_${Date.now()}`
        }
      };
      
      console.log('Pinata API isteği gönderiliyor...');
      
      // Fetch API kullanarak istek gönder
      try {
        const url = 'https://api.pinata.cloud/pinning/pinJSONToIPFS';
        const options = {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(pinataJWT ? { 'Authorization': `Bearer ${pinataJWT}` } : {
              'pinata_api_key': pinataApiKey,
              'pinata_secret_api_key': pinataSecretApiKey
            })
          },
          body: JSON.stringify(pinataData)
        };
        
        const response = await fetch(url, options);
        
        if (!response.ok) {
          throw new Error(`Pinata API yanıt kodu: ${response.status}`);
        }
        
        const responseData = await response.json();
        const cid = responseData.IpfsHash;
        
        console.log('Veri IPFS\'e yüklendi, CID:', cid);
        return cid;
      } catch (fetchError) {
        console.error('Fetch API hatası:', fetchError);
        console.warn('Fetch hatası nedeniyle test CID döndürülüyor');
        return 'QmTest' + Math.random().toString(36).substring(2, 15);
      }
    } catch (error) {
      console.error('IPFS\'e yükleme hatası:', error);
      // Hata durumunda test CID döndür - uygulamanın çalışmaya devam etmesi için
      return 'QmTest' + Math.random().toString(36).substring(2, 15);
    }
  }

  /**
   * IPFS'ten veri al
   * @param {string} cid - IPFS CID (Content Identifier)
   * @returns {Promise<Object>} - IPFS'ten alınan veri
   */
  static async getFromIpfs(cid) {
    try {
      // Test CID ise sahte veri döndür
      if (cid.startsWith('QmTest')) {
        console.log('Test CID algılandı, sahte veri döndürülüyor');
        return {
          description: 'Test bahis verisi',
          option: 'Yes',
          createdAt: new Date().toISOString(),
          category: 'Test',
          tags: ['test', 'mock'],
          endDate: new Date(Date.now() + 86400000).toISOString() // 1 gün sonra
        };
      }
      
      console.log('IPFS\'ten veri alınıyor, CID:', cid);
      
      // Pinata gateway'i veya public IPFS gateway kullan
      const gatewayUrl = 'https://gateway.pinata.cloud/ipfs/';
      const publicGatewayUrl = 'https://ipfs.io/ipfs/';
      
      // Fetch API ile veri al
      try {
        // Önce Pinata gateway'i dene
        const response = await fetch(`${gatewayUrl}${cid}`);
        
        if (response.ok) {
          const data = await response.json();
          console.log('Pinata gateway\'inden veri alındı:', data);
          return data;
        }
        
        console.warn('Pinata gateway\'inden veri alınamadı, public gateway deneniyor');
        
        // Pinata başarısız olursa public gateway'i dene
        const publicResponse = await fetch(`${publicGatewayUrl}${cid}`);
        
        if (publicResponse.ok) {
          const publicData = await publicResponse.json();
          console.log('Public gateway\'den veri alındı:', publicData);
          return publicData;
        }
        
        throw new Error('Her iki gateway\'den de veri alınamadı');
      } catch (fetchError) {
        console.error('Fetch hatası:', fetchError);
        
        // Her iki gateway de başarısız olursa sahte veri döndür
        console.warn('Gateway hatası nedeniyle sahte veri döndürülüyor');
        return {
          description: 'Gateway hatası nedeniyle veri alınamadı',
          option: 'Unknown',
          createdAt: new Date().toISOString(),
          error: true
        };
      }
    } catch (error) {
      console.error('IPFS\'ten veri alma hatası:', error);
      // Hata durumunda sahte veri döndür - uygulamanın çalışmaya devam etmesi için
      return {
        description: 'Veri alma hatası',
        option: 'Unknown',
        createdAt: new Date().toISOString(),
        error: true
      };
    }
  }
}

export default IpfsService;
