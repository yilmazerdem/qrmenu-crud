const express = require('express');
const sql = require('mssql');
const cors = require('cors');
const app = express();

app.use(cors());
app.use(express.json());

const config = {
    server: '78.188.35.167',
    user: 'sa',
    password: '14321',
    options: {
        encrypt: false,
        trustServerCertificate: false,
        enableArithAbort: true,
        cryptoCredentialsDetails: {
            minVersion: 'TLSv1'
        }
    }
};

let pool;

async function connectDB() {
    try {
        pool = await new sql.ConnectionPool(config).connect();
        console.log('Veritabanına bağlandı');
    } catch (err) {
        console.error('Veritabanı bağlantı hatası:', err);
    }
}

connectDB();

// Menü gruplarını getir
app.get('/api/menu-groups', async (req, res) => {
    try {
        if (!pool) {
            throw new Error('Veritabanı bağlantısı kurulamadı');
        }
        const result = await pool.request()
            .query(`
                select 
                    ID
                    ,MENU_KOD
                    ,ACIKLAMA
                    ,SATIS_GRUBU
                    ,BASLAMA_TARIHI
                    ,BITIM_TARIHI
                    ,BASLAMA_SAATI
                    ,BITIM_SAATI
                    ,PAZARTESI
                    ,SALI
                    ,CARSAMBA
                    ,PERSEMBE
                    ,CUMA
                    ,CUMARTESI
                    ,PAZAR
                    ,DEPO
                    ,SUBE_KODU
                    ,SB_YN
                from   [MIKOM_RSP_DD_DD_2021_Yedek].[dbo].[MENU]
            `);
        
        res.json(result.recordset);
    } catch (err) {
        console.error('Sorgu hatası:', err);
        res.status(500).json({ error: 'Veritabanı hatası: ' + err.message });
    }
});

// Seçilen menü grubuna göre ürünleri getir
app.get('/api/products/:menuId', async (req, res) => {
    try {
        if (!pool) {
            throw new Error('Veritabanı bağlantısı kurulamadı');
        }
        const result = await pool.request()
            .input('menuId', sql.Int, req.params.menuId)
            .query(`
                SELECT 
                    ID
                    ,SIRA
                    ,URUN_KOD
                    ,ACIKLAMA
                    ,BIRIM
                    ,KDV_DURUMU
                    ,FIYATI
                    ,DOVIZ_BIRIMI
                    ,ODEME_TURU
                    ,CATEGORY
                    ,CEV_KAT
                    ,ALT_CATEGORY
                    ,YAZICI_GRUBU
                    ,NOT_GRUBU
                    ,SCR_ORDER
                    ,POS_ORDER
                    ,EKMI
                    ,EK_KOD
                    ,KDV
                    ,DEPO
                    ,SUBE_KODU
                    ,MARS_PRN
                    ,FIYAT_2
                    ,PUAN
                    ,ST
                    ,VT
                    ,Y_FIYAT
                    ,BB_FIYAT
                    ,DD_FIYAT
                    ,Y_FIYAT_2
                    ,BB_FIYAT_2
                    ,DD_FIYAT_2
                FROM [MIKOM_RSP_DD_DD_2021_Yedek].[dbo].[MENUHAR]
                WHERE ID = @menuId
                ORDER BY CATEGORY
            `);
        
        res.json(result.recordset);
    } catch (err) {
        console.error('Sorgu hatası:', err);
        res.status(500).json({ error: 'Veritabanı hatası: ' + err.message });
    }
});

// Yeni ürün ekleme
app.post('/api/products', async (req, res) => {
    try {
        if (!pool) {
            throw new Error('Veritabanı bağlantısı kurulamadı');
        }
        
        const {
            MENU_ID,
            URUN_KOD,
            ACIKLAMA,
            CATEGORY,
            FIYATI,
            BIRIM,
            KDV
        } = req.body;

        const result = await pool.request()
            .input('menuId', sql.Int, MENU_ID)
            .input('urunKod', sql.VarChar, URUN_KOD)
            .input('aciklama', sql.NVarChar, ACIKLAMA)
            .input('category', sql.NVarChar, CATEGORY)
            .input('fiyat', sql.Decimal, FIYATI)
            .input('birim', sql.VarChar, BIRIM)
            .input('kdv', sql.Decimal, KDV)
            .query(`
                INSERT INTO [MIKOM_RSP_DD_DD_2021_Yedek].[dbo].[MENUHAR]
                (ID, URUN_KOD, ACIKLAMA, CATEGORY, FIYATI, BIRIM, KDV)
                VALUES
                (@menuId, @urunKod, @aciklama, @category, @fiyat, @birim, @kdv);
                
                SELECT SCOPE_IDENTITY() as id;
            `);
        
        res.json({ success: true, id: result.recordset[0].id });
    } catch (err) {
        console.error('Ekleme hatası:', err);
        res.status(500).json({ error: 'Veritabanı hatası: ' + err.message });
    }
});

// Ürün güncelleme
app.put('/api/products/:id', async (req, res) => {
    try {
        if (!pool) {
            throw new Error('Veritabanı bağlantısı kurulamadı');
        }

        const {
            URUN_KOD,
            ACIKLAMA,
            CATEGORY,
            FIYATI,
            BIRIM,
            KDV
        } = req.body;

        const result = await pool.request()
            .input('id', sql.Int, req.params.id)
            .input('urunKod', sql.VarChar, URUN_KOD)
            .input('aciklama', sql.NVarChar, ACIKLAMA)
            .input('category', sql.NVarChar, CATEGORY)
            .input('fiyat', sql.Decimal(18,2), FIYATI)
            .input('birim', sql.VarChar, BIRIM)
            .input('kdv', sql.Decimal(18,2), KDV)
            .query(`
                UPDATE [MIKOM_RSP_DD_DD_2021_Yedek].[dbo].[MENUHAR]
                SET 
                    URUN_KOD = @urunKod,
                    ACIKLAMA = @aciklama,
                    --CATEGORY = @category,
                    FIYATI = @fiyat,
                    BIRIM = @birim,
                    KDV = @kdv
                WHERE 
                    ID = @id AND 
                    URUN_KOD=@urunkod
                
                SELECT @@ROWCOUNT as affected;
            `);
        
        if (result.recordset[0].affected === 0) {
            res.status(404).json({ error: 'Güncellenecek ürün bulunamadı' });
            return;
        }

        res.json({ success: true });
    } catch (err) {
        console.error('Güncelleme hatası:', err);
        res.status(500).json({ error: 'Veritabanı hatası: ' + err.message });
    }
});

// Ürün silme
app.delete('/api/products/:id/:urunKod', async (req, res) => {
    try {
        if (!pool) {
            throw new Error('Veritabanı bağlantısı kurulamadı');
        }

        const result = await pool.request()
            .input('id', sql.Int, req.params.id)
            .input('urunKod', sql.VarChar, req.params.urunKod)
            .query(`
                DELETE FROM [MIKOM_RSP_DD_DD_2021_Yedek].[dbo].[MENUHAR]
                WHERE ID = @id AND URUN_KOD = @urunKod;
                
                SELECT @@ROWCOUNT as affected;
            `);

        if (result.recordset[0].affected === 0) {
            res.status(404).json({ error: 'Silinecek ürün bulunamadı' });
            return;
        }

        res.json({ success: true });
    } catch (err) {
        console.error('Silme hatası:', err);
        res.status(500).json({ error: 'Veritabanı hatası: ' + err.message });
    }
});

const PORT = 3000;
app.listen(PORT, () => {
    console.log(`Server http://localhost:${PORT} adresinde çalışıyor`);
});


