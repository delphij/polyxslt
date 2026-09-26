<?xml version="1.0" encoding="UTF-8"?>
<xsl:stylesheet xmlns:xsl="http://www.w3.org/1999/XSL/Transform" xmlns:n="urn:n" version="1.0">
  <xsl:output method="html"/>
  <xsl:template match="/">
    <html>
      <body>
        <xsl:apply-templates select="//name | //date | //@kind | doc/title/text() | //price"/>
      </body>
    </html>
  </xsl:template>
  <xsl:template match="doc/item/name">
    <b>child-path:<xsl:value-of select="."/></b>
  </xsl:template>
  <xsl:template match="doc//date">
    <b>desc:<xsl:value-of select="."/></b>
  </xsl:template>
  <xsl:template match="item[@kind='a']/name">
    <b>pred:<xsl:value-of select="."/></b>
  </xsl:template>
  <xsl:template match="item[2]/name">
    <b>pos:<xsl:value-of select="."/></b>
  </xsl:template>
  <xsl:template match="@kind">
    <b>attr:<xsl:value-of select="."/></b>
  </xsl:template>
  <xsl:template match="/doc/title/text()">
    <b>text:<xsl:value-of select="."/></b>
  </xsl:template>
  <xsl:template match="//price[. = 'n/a']">
    <b>root-desc:<xsl:value-of select="."/></b>
  </xsl:template>
  <xsl:template match="item[last()]/price">
    <b>last:<xsl:value-of select="."/></b>
  </xsl:template>
</xsl:stylesheet>
