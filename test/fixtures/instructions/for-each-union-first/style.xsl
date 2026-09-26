<?xml version="1.0" encoding="UTF-8"?>
<xsl:stylesheet xmlns:xsl="http://www.w3.org/1999/XSL/Transform" xmlns:n="urn:n" version="1.0">
  <xsl:output method="html"/>
  <xsl:template match="/">
    <html>
      <body>
        <xsl:for-each select="(doc/item[@kind='b'] | doc/n:extra)[1]">
          <p>
            <xsl:value-of select="name()"/>
          </p>
        </xsl:for-each>
        <xsl:for-each select="(doc/n:extra | doc/title)[1]">
          <p>
            <xsl:value-of select="."/>
          </p>
        </xsl:for-each>
      </body>
    </html>
  </xsl:template>
</xsl:stylesheet>
