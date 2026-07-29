-- Sources presse pro V1 : flux RSS vérifiés uniquement (URL confirmée
-- accessible). D'autres candidats identifiés mais non vérifiés sont
-- documentés dans docs/SOURCES.md — à ajouter ici une fois leur flux
-- RSS confirmé manuellement.

INSERT INTO press_sources (name, category, feed_url, url_human, jurisdiction_hint) VALUES
('Vitisphere', 'trade_press', 'https://www.vitisphere.com/index.php?mode=rss', 'https://www.vitisphere.com', 'EU'),
('Libation Law Blog', 'law_firm_blog', 'https://libationlawblog.com/feed/', 'https://libationlawblog.com', 'US')
ON CONFLICT (name) DO NOTHING;
