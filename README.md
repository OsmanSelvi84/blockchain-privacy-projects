# Attribute-Based Encryption (CP-ABE)

Veriyi, kullanıcının sahip olduğu özelliklere (attribute) göre şifreleyen küçük bir
proje. Mesela bir dosyayı "doctor AND (cardiology OR admin)" politikasıyla
şifreliyorsun; sadece bu attribute'lara sahip biri açabiliyor, başkası açamıyor.
Erişim kontrolünü şifrenin kendisi yapıyor.

Hepsini sıfırdan yazdım, ekstra kütüphane yok, sadece Python (3.10+).

## Çalıştırma

```bash
python3 demo.py
```

Tek bir senaryo denemek için:

```bash
python3 demo.py --policy "doctor AND (cardiology OR admin)" --attributes "doctor,cardiology" --message "gizli mesaj"
```

Politikada attribute isimlerini düz yazıyorsun, aralarına AND / OR koyuyorsun,
parantez kullanabiliyorsun. "k tanesi yeterli" demek için THRESHOLD(2, a, b, c).

## Testler

```bash
python3 -m unittest test_abe -v
```

## Örnek çıktı

```
Policy        : doctor AND (cardiology OR admin)
User holds    : ['doctor', 'cardiology']
Decision      : ACCESS GRANTED
Recovered text: gizli mesaj
```

Attribute'lar politikayı sağlamazsa "ACCESS DENIED" yazıyor ve veri çözülmüyor.

## Dosyalar

- `abe.py` — şifreleme/şifre çözme mantığı
- `demo.py` — demo ve komut satırı
- `test_abe.py` — testler

## Nasıl çalışıyor

Şifrelerken rastgele bir gizli sayı seçip ondan bir anahtar türetiyorum, veriyi o
anahtarla şifreliyorum. Gizli sayıyı da politika ağacına Shamir secret sharing ile
dağıtıyorum: AND için bütün parçalar gerekiyor, OR için bir tanesi yetiyor. Her
attribute'un payı o attribute'un anahtarıyla gizleniyor. Çözerken kullanıcı elindeki
attribute'larla payları toplayıp Lagrange interpolasyonuyla gizli sayıyı geri
kuruyor — ama yeterli attribute'u yoksa kuramıyor.

## Kaynaklar ve referans implementasyon

Bu proje, klasik CP-ABE yapısına (access tree + secret sharing + Lagrange) dayanıyor.
İncelediğim kaynaklar ve referanslar:

Makaleler:
- Bethencourt, Sahai, Waters – Ciphertext-Policy Attribute-Based Encryption (2007)
- Shamir – How to Share a Secret (1979)

Referans implementasyonlar (aynı fikir, pairing/Charm tabanlı):
- Zhiyi-Zhang/Python-ABE — https://github.com/Zhiyi-Zhang/Python-ABE
- sagrawal87/ABE — https://github.com/sagrawal87/ABE
- Doktor-hasta örnekli anlatım — https://bennycheung.github.io/attribute-based-encryption-for-healthcare-blockchain

Fark: referanslar bilineer eşleme (pairing) kullanıp collusion'a dayanıklıdır ve Charm
kütüphanesi gerektirir; bu proje aynı mantığın bağımlılıksız, daha sade bir versiyonudur.
Karşılaştırma: aynı politika + aynı özellik kümesi için iki taraf da aynı erişim kararını
(GRANTED / DENIED) verir.
