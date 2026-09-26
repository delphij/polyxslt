<?xml version="1.0" encoding="UTF-8"?>
<xsl:stylesheet xmlns:xsl="http://www.w3.org/1999/XSL/Transform" xmlns:n="urn:n" version="1.0">
  <xsl:output method="html"/>
  <xsl:template match="/">
    <html>
      <body>
        <div class="icon">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true">
            <path d="M1 1h22"/>
            <circle cx="12" cy="12" r="3"/>
            <line x1="1" y1="1" x2="2" y2="2"/>
            <polyline points="1 2 3 4"/>
            <foreignObject>
              <div>html</div>
            </foreignObject>
          </svg>
        </div>
        <math>
          <mi>x</mi>
        </math>
      </body>
    </html>
  </xsl:template>
</xsl:stylesheet>
