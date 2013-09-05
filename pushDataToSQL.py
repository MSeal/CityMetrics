import MySQLdb as sql
import cPickle as pickle
import os
import sys
import re

DATA_DIR = "data"
WIKI_DATA_DUMP = "city_resources.pck"
CRIME_DATA_DUMP = "crime.pck"
POLICE_DATA_DUMP = "police.pck"

STR_TYPE = "VARCHAR(255)"
DESCRIPTION_TYPE = "TEXT"
INT_TYPE = "INT"
FLOAT_TYPE = "DOUBLE"
DATE_TYPE = "DATE"

WIKI_STAT_RENAME = {"wgs84_pos#lat": "latitude", "wgs84_pos#long": "longitude", "populationTotal": "population",
                    "mayor" : "leaderName", "leader" : "leaderName", "populationUrban" : "populationMetro",
                    "nick" : "nickname", "isPartOf" : "parentGroup" }
WIKI_TYPE = { "areaCode" : INT_TYPE, "areaLand" : FLOAT_TYPE, "areaTotal" : FLOAT_TYPE, "areaWater" : FLOAT_TYPE, 
              "country" : STR_TYPE, "daylightSavingTimeZone" : STR_TYPE, "district" : STR_TYPE, "elevation" : FLOAT_TYPE, 
              "foundingDate" : DATE_TYPE, "governmentType" : STR_TYPE, "homepage" : STR_TYPE, "latitude" : FLOAT_TYPE, 
              "leaderName" : STR_TYPE, "leaderTitle" : STR_TYPE, "longitude" : FLOAT_TYPE, "motto" : DESCRIPTION_TYPE, 
              "name" : STR_TYPE, "nickname" : STR_TYPE, "parentGroup" : STR_TYPE, "population" : INT_TYPE, 
              "populationDensity" : FLOAT_TYPE, "populationMetro" : STR_TYPE, "postalCode" : STR_TYPE, "region" : STR_TYPE, 
              "state" : STR_TYPE, "timeZone" : STR_TYPE, "type" : STR_TYPE, "utcOffset" : STR_TYPE }
WIKI_STAT_NO_DUP = set(["areaLand", "areaTotal", "areaWater", "country", "district", "elevation", "foundingDate", 
                        "governmentType", "homepage", "latitude", "leaderTitle", "longitude", 
                        "name", "population", "populationDensity", "populationMetro", "region", "state", "type"])
WIKI_STAT_DUP = set([k for k in WIKI_TYPE.keys() if k not in WIKI_STAT_NO_DUP])
WIKI_POPULATION_FIXES = { "Nantong" : 7282835, "Durg" : 281436, "Johnstown,_Colorado" : 9887, "Milliken,_Colorado" : 6159 }
WIKI_NAME_FIXES = { "250px" : "" }
WIKI_PRIMARY_TABLE = "cityPrimaryStats"
CRIME_TABLE = "cityCrime"
POLICE_TABLE = "cityPolice"

SQL_BLOCK_SIZE = 1000

def extractNoDupStats(stats):
    return { k : v for k,v in stats.items() if k in WIKI_STAT_NO_DUP }

def extractDupStats(stats):
    return { k : v for k,v in stats.items() if k in WIKI_STAT_DUP }

def tableNameFromKey(key):
    return "city" + key[0].upper() + key[1:]

def createDB(cur):
    cur.execute("DROP DATABASE IF EXISTS `metrics`;")
    cur.execute("CREATE DATABASE `metrics`;")
    cur.execute("USE `metrics`;")

def createWikiTables(cur):
    cur.execute("DROP TABLE IF EXISTS `%s`;" % WIKI_PRIMARY_TABLE)
    wikiItems = extractNoDupStats(WIKI_TYPE).items()
    wikiItems.sort(key=lambda kv: kv[0])
    cur.execute("CREATE TABLE `" + WIKI_PRIMARY_TABLE + "` (`id` INT NOT NULL PRIMARY KEY, " +
        ", ".join([" ".join(["`"+k+"`", v]) for k,v in wikiItems]) + ") ENGINE=InnoDB DEFAULT CHARSET=utf8;")

    for duplicate in WIKI_STAT_DUP:
        tableName = tableNameFromKey(duplicate)
        cur.execute("DROP TABLE IF EXISTS `%s`;" % tableName)
        cur.execute("CREATE TABLE `%s` (cityId INT NOT NULL, %s %s) ENGINE=InnoDB DEFAULT CHARSET=utf8;" % 
            (tableName, duplicate, WIKI_TYPE[duplicate]))
        cur.execute("CREATE INDEX `%s` ON `%s` (cityId);" % ("cityId"+tableNameFromKey(duplicate), tableName))

def cleanSQLValue(value, quoteChar=None, zeroValid=False):
    if value == None or value == "" or (not zeroValid and (value == 0 or value == "0")):
        return None
    if quoteChar and isinstance(value, basestring):
        return "%s%s%s" % (quoteChar, value.replace(quoteChar, "\\"+quoteChar), quoteChar)
    return value

def cleanSQLValuesList(elems, quoteChar=None, zeroValid=False):
    return [cleanSQLValue(e, quoteChar, zeroValid) for e in elems]

def buildPrimaryValues(stats, columns, zeroValid=False):
    colmap = { col : i for i,col in enumerate(columns) }
    entries = [None] * len(columns)
    for col, value in stats:
        entries[colmap[col]] = value
    return cleanSQLValuesList(entries, zeroValid=zeroValid)

def buildDupValues(stat, values, id):
    vstrs = []
    for value in values:
        vstrs.append([id, cleanSQLValue(value)])
    return vstrs

def insertWikiData(db, cur, wiki):
    def resetInserts():
        inserts = { WIKI_PRIMARY_TABLE : [] }
        for duplicate in WIKI_STAT_DUP:
            inserts[tableNameFromKey(duplicate)] = []
        return inserts

    columnByName = {}
    columnByName[WIKI_PRIMARY_TABLE] = list(WIKI_STAT_NO_DUP)
    columnByName[WIKI_PRIMARY_TABLE].sort()
    columnByName[WIKI_PRIMARY_TABLE] = ["id"] + columnByName[WIKI_PRIMARY_TABLE]
    for duplicate in WIKI_STAT_DUP:
        columnByName[tableNameFromKey(duplicate)] = ["cityId", duplicate]

    insertData = resetInserts()
    for count, (resource, stats) in enumerate(wiki.iteritems()):
        id = count+1
        insertData[WIKI_PRIMARY_TABLE].append(buildPrimaryValues(extractNoDupStats(stats).items() + [("id", id)], 
                                                                 columnByName[WIKI_PRIMARY_TABLE]))
        for dup, dupValues in extractDupStats(stats).items():
            insertData[tableNameFromKey(dup)].extend(buildDupValues(dup, dupValues, id))

        # Add ID tracker to data
        stats["id"] = id

        if (count > 0 and count % SQL_BLOCK_SIZE == 0) or count == len(wiki)-1:
            print "Pushing %d rows into DB" % (SQL_BLOCK_SIZE if count % SQL_BLOCK_SIZE == 0 else count % SQL_BLOCK_SIZE)
            for tableName, values in insertData.iteritems():
                if not values:
                    continue
                columns = columnByName[tableName]
                cur.executemany(("INSERT INTO `%s` (%s) VALUES (" % 
                    (tableName, ", ".join(cleanSQLValuesList(columns, "`")))) + 
                    ",".join(["%s"]*len(columns)) + ");", values)
                db.commit()
            insertData = resetInserts()

def buildWikiStateCityMap(wiki):
    wikimap = {}
    for resource, stats in wiki.iteritems():
        #print "country" in stats, "country" in stats and stats["country"] == "United States", "state" in stats, "name" in stats
        if "country" in stats and stats["country"] == "United States" and "state" in stats and "name" in stats:
            wikimap[(stats["state"], stats["name"])] = stats
    return wikimap

def insertFBIData(db, cur, data, wiki, tableName, includeCols=None):
    wikimap = buildWikiStateCityMap(wiki)
    columns = []

    for year in data:
        print "Pushing %s data into %s" % (year, tableName)
        for state in data[year]:
            insertData = []
            for count, (city, stats) in enumerate(data[year][state].iteritems()):
                if not columns:
                    columns = stats.keys()
                    if includeCols:
                        columns.extend(includeCols)
                    columns.sort()
                    columns = ["cityId", "year"] + columns
                    cur.execute("DROP TABLE IF EXISTS `%s`;" % tableName)
                    cur.execute("CREATE TABLE `" + tableName + "` (`id` INT NOT NULL PRIMARY KEY AUTO_INCREMENT, " + 
                        ", ".join(["`"+c+"` INT" for c in columns]) + ") ENGINE=InnoDB DEFAULT CHARSET=utf8;")
                    cur.execute("CREATE INDEX `%s` ON `%s` (cityId);" % 
                        ("cityId"+tableNameFromKey(tableName), tableName))

                #print (state, city)
                cityId = wikimap[(state, city)]["id"] if (state, city) in wikimap else ""
                insertData.append(buildPrimaryValues(stats.items() + 
                    [("year", str(year)), ("cityId", str(cityId))], columns, zeroValid=True))
                if count == len(data[year][state])-1:
                    cur.executemany(("INSERT INTO `%s` (%s) VALUES (" % 
                        (tableName, ", ".join(cleanSQLValuesList(columns, "`")))) + 
                        ",".join(["%s"]*len(columns)) + ");", insertData)
                    db.commit()


def loadWikipediaData():
    with open(os.path.join(DATA_DIR, WIKI_DATA_DUMP), "rb") as dfile:
        return pickle.load(dfile)

def loadCrimeData():
    with open(os.path.join(DATA_DIR, CRIME_DATA_DUMP), "rb") as dfile:
        return pickle.load(dfile)

def loadPoliceData():
    with open(os.path.join(DATA_DIR, POLICE_DATA_DUMP), "rb") as dfile:
        return pickle.load(dfile)

def generateStateCityMap(cpdata):
    stateCityMap = {}
    for year in cpdata:
        for state in cpdata[year]:
            for city, stats in cpdata[year][state].iteritems():
                if (state, city) not in stateCityMap:
                    stateCityMap[(state, city)] = {}
                stateCityMap[(state, city)][year] = stats
    return stateCityMap

def resourceHasValue(resource, value):
    for entry in resource:
        if entry[0] == value:
            return True
    return False

def dropUnitsAndLanguage(stats):
    for key, kset in stats.items():
        stats[key] = set()
        for vtuple in kset:
            stats[key].add(vtuple[0])
    return stats

def convertValue(value):
    try:
        return int(value)
    except ValueError:
        try:
            return float(value)
        except ValueError:
            return value

def convertSet(vset):
    rset = set()
    for value in vset:
        rset.add(convertValue(value))
    return rset

def allNumeric(vset):
    return all(isinstance(value, int) or isinstance(value, float) for value in vset)

def calculatePrecision(value):
    sval = "%.5f" % value
    decimal = len(sval)
    lastZero = len(sval)
    for index,c in enumerate(sval):
        if c == ".":
            decimal = index
            continue
        if c == "0":
            lastZero = index
        else:
            lastZero = len(sval)
    return lastZero - decimal

def selectHighestPrecision(vset):
    maxPrecision = -999
    bestValue = None
    for value in vset:
        precision = calculatePrecision(value)
        if precision >  maxPrecision:
            maxPrecision = precision
            bestValue = value
    return bestValue

def removeUnderscores(stats):
    for key, vset in stats.items():
        rset = set()
        for value in vset:
            if isinstance(value, basestring):
                value = value.replace("_,", ",").replace("_", " ")
            rset.add(value)
        stats[key] = rset
    return stats

def squashStats(stats):
    statsOut = {}
    for key, vset in stats.items():
        if key in WIKI_STAT_RENAME:
            key = WIKI_STAT_RENAME[key]
        if key not in WIKI_TYPE:
            continue
        vset = convertSet(vset)
        # Convert to single value
        if key in WIKI_STAT_NO_DUP:
            if allNumeric(vset):
                value = selectHighestPrecision(vset)
            else:
                # Pick arbitrarily
                value = iter(vset).next()
            statsOut[key] = value
        else:
            statsOut[key] = vset
    return statsOut

def cleanResource(resource, stats):
    stats = squashStats(removeUnderscores(dropUnitsAndLanguage(stats)))
    if "country" in stats and stats["country"] == "United States":
        if "name" not in stats:
            stats["name"] = ""
        if "," in stats["name"]:
            city, state = stats["name"].split(",", 1)
            stats["name"] = city.strip()
            if "state" not in stats:
                stats["state"] = state.strip()
    if "areaCode" in stats:
        expCodes = set([])
        for code in stats["areaCode"]:
            for intCode in re.findall(r"[0-9]+", str(code)):
                expCodes.add(int(intCode))
        stats["areaCode"] = expCodes
    if "postalCode" in stats:
        expCodes = set([])
        for code in stats["postalCode"]:
            if isinstance(code, basestring) and ("*" in code or "/" in code or "," in code):
                for intCode in re.findall(r"[0-9]+", str(code)):
                    expCodes.add(int(intCode))
            else:
                expCodes.add(code)
        stats["postalCode"] = expCodes
    for stat, value in stats.items():
        if isinstance(value, set):
            cleanval = set([v for v in value if v])
        else:
            cleanval = value if value else None
        stats[stat] = cleanval
    if resource in WIKI_POPULATION_FIXES:
        stats["population"] = WIKI_POPULATION_FIXES[resource]
    if resource in WIKI_NAME_FIXES:
        stats["name"] = WIKI_NAME_FIXES[resource]
    return resource, stats

def appendColumnCount(count, newcol):
    for col in newcol:
        if col not in count:
            count[col] = 0
        count[col] += 1

def countColumns(crime, wiki):
    allcolumns = {}
    uscolumns = {}
    mappedCount = 0
    unmappedCount = 0
    
    cpmap = generateStateCityMap(crime)
    for resource, stats in wiki.iteritems():
        resource, stats = cleanResource(resource, stats)
        appendColumnCount(allcolumns, stats)
        if "country" in stats and stats["country"] == "United States":
            appendColumnCount(uscolumns, stats)
            city = stats["name"] if "name" in stats else None
            state = stats["state"] if "state" in stats else None
            if (state, city) in cpmap:
                mappedCount += 1
            else:
                unmappedCount += 1

def cleanWikiData(wiki):
    cwiki = {}
    for resource, stats in wiki.iteritems():
        resource, stats = cleanResource(resource, stats)
        cwiki[resource] = stats
    return cwiki

if __name__ == "__main__":
    host = "127.0.0.1"
    user = "root"
    password = "toor"
    #db = "metrics"

    wiki = loadWikipediaData()
    crime = loadCrimeData()
    police = loadPoliceData()

    # For stat generation
    #countColumns(crime, wiki)
    wiki = cleanWikiData(wiki)

    con = None
    try:
        con = sql.connect(host=host, user=user, passwd=password)
        cur = con.cursor()
        createDB(cur)
        createWikiTables(cur)
        insertWikiData(con, cur, wiki)
        insertFBIData(con, cur, crime, wiki, CRIME_TABLE)
        insertFBIData(con, cur, police, wiki, POLICE_TABLE, ["population"])
    except sql.Error, e:
        print "Error %d: %s" % (e.args[0], e.args[1])
        sys.exit(1)
    finally:
        if con:
            con.close();
