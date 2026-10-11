<?xml version="1.0" encoding="UTF-8"?>
<xsl:stylesheet xmlns:xsl="http://www.w3.org/1999/XSL/Transform" xmlns:n="urn:n" xmlns:h="http://www.w3.org/1999/xhtml" version="1.0">
  <xsl:output method="html"/>
  <xsl:variable name="tree"><DIV Class="v"><n:y a="1"><em>rtf</em></n:y></DIV></xsl:variable>
  <xsl:template match="/">
    <html>
      <body>
        <n:wrap><P ALIGN="left"><b>plain in namespaced</b></P></n:wrap>
        <h:div Class="x"><Span NOWRAP="1">plain in xhtml</Span><h:a HREF="/a b">prefixed</h:a></h:div>
        <xsl:element name="SECTION"><xsl:attribute name="Lang">en</xsl:attribute><i>computed</i></xsl:element>
        <xsl:element name="{name(doc/item[1])}" namespace="urn:n"><u>computed namespaced</u></xsl:element>
        <xsl:copy-of select="$tree"/>
        <xsl:copy-of select="doc/title"/>
        <xsl:copy-of select="doc/n:extra"/>
        <svg><title>t</title><foreignObject><P>fo</P><svg><g/></svg></foreignObject></svg>
        <math><mi>x</mi></math>
        <table><tr><td>cell</td></tr></table>
      </body>
    </html>
  </xsl:template>
</xsl:stylesheet>
