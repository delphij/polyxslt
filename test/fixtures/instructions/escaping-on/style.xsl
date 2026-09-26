<?xml version="1.0" encoding="UTF-8"?>
<xsl:stylesheet xmlns:xsl="http://www.w3.org/1999/XSL/Transform" xmlns:n="urn:n" version="1.0">
  <xsl:output method="html"/>
  <xsl:template match="/">
    <html>
      <body>
        <xsl:for-each select="doc/item">
          <div>
            <xsl:value-of select="body"/>
          </div>
        </xsl:for-each>
        <p>
          <xsl:text>&lt;em&gt;</xsl:text>
        </p>
      </body>
    </html>
  </xsl:template>
</xsl:stylesheet>
