<?xml version="1.0" encoding="UTF-8"?>
<xsl:stylesheet xmlns:xsl="http://www.w3.org/1999/XSL/Transform" xmlns:n="urn:n" version="1.0">
  <xsl:output method="html"/>
  <xsl:template match="/">
    <html>
      <body>
        <p><xsl:apply-templates select="doc/item"/></p>
        <p><xsl:apply-templates select="doc/item/name"/></p>
        <p><xsl:apply-templates select="doc/item/date"/></p>
        <p><xsl:apply-templates select="doc/item/price"/></p>
        <p><xsl:apply-templates select="doc/item/@id"/></p>
        <p><xsl:apply-templates select="doc/item/@kind"/></p>
        <p><xsl:apply-templates select="doc/item/body"/></p>
        <p><xsl:apply-templates select="doc/item/name/text()"/></p>
        <p><xsl:apply-templates select="doc/item[1]/*" /></p>
      </body>
    </html>
  </xsl:template>
  <xsl:template match="item[@kind = 'a'][2]">
    <b>second-a:<xsl:value-of select="@id"/></b>
  </xsl:template>
  <xsl:template match="item[2][@kind = 'a']">
    <b>second-if-a:<xsl:value-of select="@id"/></b>
  </xsl:template>
  <xsl:template match="item[@kind = 'b']">
    <b>b:<xsl:value-of select="@id"/></b>
  </xsl:template>
  <xsl:template match="item[count(../item) - 2]" priority="-1">
    <b>number-from-function:<xsl:value-of select="@id"/></b>
  </xsl:template>
  <xsl:template match="item[not(position() = 1)]/name">
    <b>not-first:<xsl:value-of select="."/></b>
  </xsl:template>
  <xsl:template match="item[name][price &gt; 5]/name">
    <b>two-predicates:<xsl:value-of select="."/></b>
  </xsl:template>
  <xsl:template match="item[position() = last()]/date">
    <b>last:<xsl:value-of select="."/></b>
  </xsl:template>
  <xsl:template match="item[date[starts-with(., '2024')]]/date">
    <b>nested:<xsl:value-of select="."/></b>
  </xsl:template>
  <xsl:template match="price[number(.) = number(.)]">
    <b>numeric:<xsl:value-of select="."/></b>
  </xsl:template>
  <xsl:template match="price[string-length(.)]" priority="1">
    <b>length-as-position:<xsl:value-of select="."/></b>
  </xsl:template>
  <xsl:template match="@id[. &gt; 1]">
    <b>id:<xsl:value-of select="."/></b>
  </xsl:template>
  <xsl:template match="@*[. = 1]" priority="-1">
    <b>attribute-one:<xsl:value-of select="."/></b>
  </xsl:template>
  <xsl:template match="@kind[../name = 'Second']">
    <b>kind-of-second:<xsl:value-of select="."/></b>
  </xsl:template>
  <xsl:template match="item[*[position() = 2 and self::date]]/body">
    <b>inner-position:<xsl:value-of select="string-length(.)"/></b>
  </xsl:template>
  <xsl:template match="text()[contains(., 'ir')]">
    <b>text:<xsl:value-of select="."/></b>
  </xsl:template>
  <xsl:template match="item/*[last() - 1]" priority="3">
    <b>next-to-last:<xsl:value-of select="name()"/></b>
  </xsl:template>
  <xsl:template match="item/*[true()][3]" priority="2">
    <b>third:<xsl:value-of select="name()"/></b>
  </xsl:template>
</xsl:stylesheet>
