-- Outerwear (jackets, coats): added to an outfit when the weather calls for it.

alter type public.garment_category add value if not exists 'outerwear';
