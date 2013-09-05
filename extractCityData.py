import re
import os
import cPickle as pickle
import sys
import time

DATA_DIR = "data"
DATA_DUMP = "mappingbased_properties_en.ttl"
DATA_OUT_DUMP = "city_resources"
CITY_RESOURCES = ["City", "Town"]
DEFAULT_LANGUAGE = "en"

# Handle escaped quotes
CAPTURE_QUOTED = r'"(?:\\"|[^"])*"'
CAPTURE_URL = r'<[^>]*>'
CAPTURE_NON_WHITESPACE = r'[^\s]'
CAPTURE_NON_WHITESPACE_STAR = r'[^\s]*'
LINE_PARSER = re.compile(r'('+
    # Quotes separated by any text url with possible ending text
    CAPTURE_QUOTED+CAPTURE_NON_WHITESPACE_STAR+CAPTURE_URL+CAPTURE_NON_WHITESPACE_STAR+r'|'+
    # Quotes with possible ending text
    CAPTURE_QUOTED+CAPTURE_NON_WHITESPACE_STAR+r'|'+
    # Url with possible ending text
    CAPTURE_URL+CAPTURE_NON_WHITESPACE_STAR+r'|'+
    # Non-separated text
    CAPTURE_NON_WHITESPACE+r')+')
#LINE_PARSER = re.compile(r'("(?:\\"|[^"])*"[^\s]*|<[^>]*>[^\s]*|[^\s])+')
URL_CAPTURE = re.compile(CAPTURE_URL)
QUOTE_CAPTURE = re.compile(CAPTURE_QUOTED)
QUOTE_FOLLOWED_CAPTURE = re.compile(CAPTURE_QUOTED+CAPTURE_NON_WHITESPACE_STAR)

def flushPrint(message):
    print message
    sys.stdout.flush()

def timeFunc(func, fname="Function"):
    start = time.clock()
    ret = func()
    end = time.clock()
    flushPrint(fname+" execution took %.2fs" % (end-start))
    return ret

def extractLastUrlTag(url):
    return url.strip().rsplit("/", 1)[-1][:-1]

def executeOnFile(fname, func):
    with open(fname, "rb") as rfile:
        return func(rfile)

def cacheLoadBuild(fname, opname, builder, forcebuild=False):
    try:
        if forcebuild:
            raise IOError("Force rebuild")
        with open(fname+".pck", "rb") as pfile:
            flushPrint("Loading %s Cache..." % opname)
            sys.stdout.flush()
            cache = pickle.load(pfile)
    except IOError:
        flushPrint("Rebuilding %s Cache..." % opname)
        sys.stdout.flush()
        cache = builder()
        flushPrint("Saving %s Cache..." % opname)
        sys.stdout.flush()
        with open(fname+".pck", "wb") as pfile:
            pickle.dump(cache, pfile)
    return cache

def parseQuotedValue(value):
    unit = None
    language = DEFAULT_LANGUAGE

    qvalue = re.match(QUOTE_CAPTURE, value).group()
    value = qvalue[1:-1]
    aug = value[len(qvalue):]
    
    if aug and aug[0] == "@" and aug[1:]:
        language = aug[1:]
    elif aug and aug[0:2] == "^^":
        unit = extractLastUrlTag(aug[2:])

    return value, unit, language

def buildMap(rfile):
    types = {}
    resources = {}

    for line in rfile:
        sline = line.strip()
        if sline and sline[0] == "#":
            continue

        unit = None
        language = DEFAULT_LANGUAGE

        rurl, attrurl, value, dot = re.findall(LINE_PARSER, sline)
        resource = extractLastUrlTag(rurl)
        attribute = extractLastUrlTag(attrurl)
        if re.match(URL_CAPTURE, value):
            value = extractLastUrlTag(value)
        elif re.match(QUOTE_FOLLOWED_CAPTURE, value):
            value, unit, language = parseQuotedValue(value)

        if attribute == "type":
            if value not in types:
                types[value] = set()
            types[value].add(resource)

        if resource not in resources:
            resources[resource] = {}
        if attribute not in resources[resource]:
            resources[resource][attribute] = set()
        resources[resource][attribute].add((value, unit, language))
        #print resource, attribute, resources[resource][attribute]

    return types, resources

def mapResouces(fname, forcebuild=False):
    return cacheLoadBuild(fname, "Resouce Mapping", lambda: executeOnFile(fname, buildMap), forcebuild)

def selectResourcesByType(types, resouces, typeSelect):
    selectData = {}

    validResources = set()
    for rtype, rset in types.iteritems():
        if rtype in typeSelect:
            validResources |= rset

    for resource, attrs in resouces.iteritems():
        if resource in validResources:
            selectData[resource] = attrs

    return selectData

def rawDataLoader(dataDump, *args):
    return list(mapResouces(dataDump)) + list(args)

def extractCityData(processedDataDump, rawDataDump):
    return cacheLoadBuild(processedDataDump, "City Extraction", lambda: selectResourcesByType(*rawDataLoader(rawDataDump, CITY_RESOURCES)), True)

if __name__ == "__main__":
    rawDataDump = os.path.join(DATA_DIR, DATA_DUMP)
    processedDataDump = os.path.join(DATA_DIR, DATA_OUT_DUMP)
    #types, resources = timeFunc(lambda: mapResouces(rawDataDump))
    #cityData = selectResourcesByType(types, resources, CITY_RESOURCES)
    extractCityData(processedDataDump, rawDataDump)
