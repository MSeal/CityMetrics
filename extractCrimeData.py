import csv
import os
import re
import sys
import cPickle as pickle
from glob import glob

DATA_DIR = "data"
CRIME_DATA_NAMING = "offenses_known_to_law_enforcement_by_state_by_city_*.csv"
CRIME_DATA_OUT_NAME = "crime.pck"
CRIME_TITLE_REPLACEMENTS = {
    "State" : "state",
    "City" : "city",
    "Violent crime" : "violentCrime",
    "Murder and nonnegligent manslaughter" : "murderManslaughter",
    "Forcible rape" : "forcibleRape",
    "Robbery" : "robbery",
    "Aggravated assault" : "aggravatedAssault",
    "Property crime" : "propertyCrime",
    "Burglary" : "burglary",
    "Larceny-theft" : "larcenyTheft",
    "Motor vehicle theft" : "motorTheft",
    "Arson" : "arson", "Arson1" : "arson"
}

POLICE_DATA_NAMING = "law_enforcement_employees_by_state_by_city_*.csv"
POLICE_DATA_OUT_NAME = "police.pck"
POLICE_TITLE_REPLACEMENTS = {
    "State" : "state",
    "City" : "city",
    "Total law enforcement employees" : "lawEnforcementEmployees",
    "Total officers" : "officers",
    "Total civilians" : "civilians",
    "Population" : "populationFBI",
    "population" : "populationFBI"
}

def flushPrint(message):
    print message
    sys.stdout.flush()

def translateRowData(row):
    trow = []
    for elem in row:
        if isinstance(elem, basestring):
            elem = elem.strip().replace(",", "")
        if not elem:
            elem = None
        else:
            elem = int(elem)
        trow.append(elem)        
    return trow

def translateTitles(titles, titleReplace=None):
    titlesOut = []
    if not titleReplace:
        titleReplace = {}
    
    for t in titles:
        if t:
            t = t.replace("\n", " ").replace("- ", "-").replace("  ", " ")
        if t in titleReplace:
            t = titleReplace[t]
        titlesOut.append(t)

    while not titlesOut[-1]:
        titlesOut.pop()
    return titlesOut

def processState(state):
    # Strip numbers, hashes, commas, etc...
    return " ".join(re.findall("[a-zA-Z\s]+", state)).title().strip()

def extractSingleCSV(csvdata, titleReplace=None):
    titles = []
    data = {}
    year = None
    priorRow = []
    for rnum,row in enumerate(csvdata):
        if rnum < 2:
            continue
        elif rnum == 2:
            year = row[0].split()[-1]
        elif rnum == 3:
            titles = translateTitles(row, titleReplace)
        else:
            # Capture state from previous entry if absent
            if not row[0]:
                row[0] = priorRow[0]
            state = processState(row[0])
            city = row[1]

            # Skip data rows without city titles
            if not city.strip():
                continue

            if state not in data:
                data[state] = {}
            
            if city not in data[state]:
                data[state][city] = {}
            for key, value in zip(titles[2:], translateRowData(row[2:])):
                data[state][city][key] = value
        priorRow = row

    return year, data

def extractData(fnaming, titleReplace=None):
    data = {}
    for fname in glob(fnaming):
        flushPrint("Extracting data from %s" % fname)
        with open(fname, "rb") as csvfile:
            year, fdata = extractSingleCSV(csv.reader(csvfile), titleReplace)
            data[year] = fdata
    return data

def saveDataDump(fname, data):
    flushPrint("Saving data to %s" % fname)
    with open(fname, "wb") as pfile:
        pickle.dump(data, pfile)

if __name__ == "__main__":
    data = extractData(os.path.join(DATA_DIR, CRIME_DATA_NAMING), CRIME_TITLE_REPLACEMENTS)
    saveDataDump(os.path.join(DATA_DIR, CRIME_DATA_OUT_NAME), data)
    data = extractData(os.path.join(DATA_DIR, POLICE_DATA_NAMING), POLICE_TITLE_REPLACEMENTS)
    saveDataDump(os.path.join(DATA_DIR, POLICE_DATA_OUT_NAME), data)
