#!/usr/bin/env python3
"""
Generation and semantic deduplication pipeline for scaling the Mr.Roast dataset.
Includes a taxonomy of 10 categories with 150 elite, cynical, dry one-liner roasts
(<= 14 words, zero emojis, zero exclamation marks, targeting vanity/futility).
Uses SentenceTransformer all-MiniLM-L6-v2 to prune entries with pairwise similarity > 0.88.
"""

import json
import os
import re
import sys
from pathlib import Path

import numpy as np
from sentence_transformers import SentenceTransformer

ROOT_DIR = Path(__file__).resolve().parent.parent.parent
API_DIR = ROOT_DIR / "api"
DATA_FILE = API_DIR / "data" / "dev_roasts.json"

TAXONOMY = [
    "corporate",
    "tech",
    "fitness",
    "productivity",
    "money",
    "dating",
    "academia",
    "cooking",
    "travel",
    "self_care",
]

# 150 Elite Seed Roasts across 10 categories (15 per category)
SEED_ROASTS = [
    # --- CORPORATE (15) ---
    {
        "category": "corporate",
        "roast": "Congratulations on the promotion. Same compensation, four more meetings a day.",
        "anchors": [
            "Got promoted to senior manager today",
            "Finally received my promotion at work",
            "Stepped up to lead my team",
            "Officially promoted to director",
        ],
    },
    {
        "category": "corporate",
        "roast": "Your reward for being efficient is the unfinished work of your colleagues.",
        "anchors": [
            "Finished all my sprint deliverables early",
            "Completed all my project milestones ahead of schedule",
            "Cleared my entire backlog today",
            "Delivered the client presentation three days early",
        ],
    },
    {
        "category": "corporate",
        "roast": "The company values your loyalty until next quarter's margin review.",
        "anchors": [
            "Celebrated five years at my company today",
            "Ten years of service at my firm",
            "Marked my work anniversary at the office",
            "Staying loyal to my team for four years",
        ],
    },
    {
        "category": "corporate",
        "roast": "A standing ovation on Zoom is just people unmuting by accident.",
        "anchors": [
            "Gave an all-hands presentation today",
            "Presented our quarterly roadmap to leadership",
            "Delivered our company keynote speech",
            "Hosted the global town hall meeting",
        ],
    },
    {
        "category": "corporate",
        "roast": "Your performance bonus after taxes will cover half of your therapist.",
        "anchors": [
            "Received my annual performance bonus today",
            "Got a huge bonus for Q3 results",
            "Rewarded with a great year-end bonus",
            "Earned my target achievement bonus",
        ],
    },
    {
        "category": "corporate",
        "roast": "You survived the reorg just in time for the next reorg.",
        "anchors": [
            "Survived the company restructuring",
            "Made it through the department reorg safely",
            "Kept my role after the company merger",
            "Navigated the corporate acquisition smoothly",
        ],
    },
    {
        "category": "corporate",
        "roast": "Leadership noticed your hard work and scheduled another weekly sync.",
        "anchors": [
            "Leadership commended my project deliverables",
            "The VP praised our team execution",
            "Executive team loved my strategy document",
            "Got direct praise from the CEO today",
        ],
    },
    {
        "category": "corporate",
        "roast": "All that networking just to exchange polite nods at airport lounges.",
        "anchors": [
            "Attended a great executive summit",
            "Built so many connections at the conference",
            "Expanded my professional network in Chicago",
            "Met amazing industry leaders this week",
        ],
    },
    {
        "category": "corporate",
        "roast": "Enjoy the executive corner desk while the lease remains active.",
        "anchors": [
            "Moved into my new corner office today",
            "Got upgraded to a private office space",
            "Finally have my own executive desk",
            "Decorated my new director office",
        ],
    },
    {
        "category": "corporate",
        "roast": "A LinkedIn recommendation is a polite eulogy for your weekend.",
        "anchors": [
            "Received a glowing LinkedIn recommendation today",
            "Colleagues wrote amazing reviews on my profile",
            "My manager endorsed all my skills",
            "Got five new peer recommendations",
        ],
    },
    {
        "category": "corporate",
        "roast": "You solved the client escalation by agreeing to work on Sunday.",
        "anchors": [
            "Resolved a critical client emergency today",
            "Saved a major enterprise account",
            "De-escalated our biggest customer conflict",
            "Turned around an angry client relationship",
        ],
    },
    {
        "category": "corporate",
        "roast": "A company award is a cheap plaque to delay your raise.",
        "anchors": [
            "Won employee of the month today",
            "Awarded high performer of the year",
            "Received the annual excellence trophy",
            "Recognized as top contributor of our division",
        ],
    },
    {
        "category": "corporate",
        "roast": "Enjoy the catered lunch. It was funded by unpaid overtime.",
        "anchors": [
            "Free catered sushi lunch at the office today",
            "Company bought us lunch to celebrate success",
            "Enjoyed our team milestone lunch",
            "Executive lunch provided for the department",
        ],
    },
    {
        "category": "corporate",
        "roast": "You mentored an intern who will replace you in eighteen months.",
        "anchors": [
            "Mentored a brilliant college intern this summer",
            "Finished training our new team member",
            "Helped onboard our summer analyst cohort",
            "Loved guiding our junior associate",
        ],
    },
    {
        "category": "corporate",
        "roast": "Signing a lucrative retainer just guarantees more emergency phone calls.",
        "anchors": [
            "Signed a massive annual client retainer",
            "Closed a six figure consulting engagement",
            "Secured a new enterprise contract",
            "Renewed our largest recurring service deal",
        ],
    },

    # --- TECH (15) ---
    {
        "category": "tech",
        "roast": "You solved fifty LeetCode hard problems to center buttons in Jira.",
        "anchors": [
            "Passed all coding rounds at Meta",
            "Cleared my technical interview at Apple",
            "Aced the system design loops",
            "Cracked my dream FAANG job",
        ],
    },
    {
        "category": "tech",
        "roast": "Shipped to production on a Friday. Enjoy your ruined weekend.",
        "anchors": [
            "Deployed our major release to prod today",
            "Shipped the new version to production",
            "Pushed our v2 launch live today",
            "Finished our quarterly production rollout",
        ],
    },
    {
        "category": "tech",
        "roast": "Rewriting the codebase in Rust will not fix your product.",
        "anchors": [
            "Rewrote our backend services in Rust",
            "Migrated our legacy microservices to Rust",
            "Ported our core architecture to Rust",
            "Rebuilt our parser using Rust",
        ],
    },
    {
        "category": "tech",
        "roast": "Your microservices architecture is just distributed failure with extra latency.",
        "anchors": [
            "Split our monolith into twenty microservices",
            "Designed a distributed cloud architecture",
            "Finished our Kubernetes cluster migration",
            "Adopted event-driven microservices",
        ],
    },
    {
        "category": "tech",
        "roast": "Open source contributors will ignore your project until someone finds vulnerabilities.",
        "anchors": [
            "Published my open source library to GitHub",
            "Open sourced my developer tooling framework",
            "Released my TypeScript utility package",
            "Shared my open source repository publicly",
        ],
    },
    {
        "category": "tech",
        "roast": "A thousand GitHub stars will not pay your hosting bill.",
        "anchors": [
            "Hit 1000 stars on my GitHub repository",
            "Reached 500 GitHub stargazers today",
            "My open source repo is trending on GitHub",
            "Crossed 2000 stars on my open source tool",
        ],
    },
    {
        "category": "tech",
        "roast": "You automated a five minute task in only forty-two hours.",
        "anchors": [
            "Automated my entire daily workflow with Python",
            "Built a custom automation script for work",
            "Automated our deployment pipeline completely",
            "Wrote a script to automate routine tasks",
        ],
    },
    {
        "category": "tech",
        "roast": "A new mechanical keyboard will not make your code compile.",
        "anchors": [
            "Built my custom mechanical keyboard today",
            "Got a new ergonomic split keyboard",
            "Finished soldering my custom key switches",
            "Upgraded to an artisan mechanical keyboard",
        ],
    },
    {
        "category": "tech",
        "roast": "Your AI startup is just a wrapper around someone else's API.",
        "anchors": [
            "Launched my new AI startup on Product Hunt",
            "Shipped our generative AI SaaS application",
            "Built an AI tool that solves real problems",
            "Went live with our autonomous AI agent",
        ],
    },
    {
        "category": "tech",
        "roast": "Clean architecture cannot save a product nobody wants to use.",
        "anchors": [
            "Refactored our entire codebase to clean architecture",
            "Completed a massive codebase cleanup",
            "Eliminated all technical debt in our app",
            "Implemented domain driven design",
        ],
    },
    {
        "category": "tech",
        "roast": "Achieved one hundred percent test coverage for bugs users find first.",
        "anchors": [
            "Reached 100 percent unit test coverage",
            "All unit and integration tests passing",
            "Zero untested code paths in our app",
            "Wrote end-to-end tests for every single feature",
        ],
    },
    {
        "category": "tech",
        "roast": "A multi-cloud deployment just means paying two cloud providers instead.",
        "anchors": [
            "Migrated our infrastructure to multi-cloud",
            "Built hybrid AWS and GCP deployments",
            "Set up multi-region cloud redundancy",
            "Achieved multi-cloud high availability",
        ],
    },
    {
        "category": "tech",
        "roast": "You closed fifty tickets and created eighty-five new edge cases.",
        "anchors": [
            "Resolved all pending bug tickets today",
            "Cleared the entire issue tracker",
            "Squashed twenty critical bugs this week",
            "Closed all open issues in our repo",
        ],
    },
    {
        "category": "tech",
        "roast": "Buying three curved monitors will not increase your attention span.",
        "anchors": [
            "Set up my triple monitor developer desk",
            "Upgraded to an ultrawide curved monitor",
            "Built the ultimate programming battle station",
            "My multi-monitor workspace is complete",
        ],
    },
    {
        "category": "tech",
        "roast": "You optimized a database query from three milliseconds to two milliseconds.",
        "anchors": [
            "Optimized our slow database query by 50%",
            "Added compound indexes for database speed",
            "Tuned our PostgreSQL query performance",
            "Reduced query latency across all tables",
        ],
    },

    # --- FITNESS (15) ---
    {
        "category": "fitness",
        "roast": "If nobody saw your Strava route, did you actually run.",
        "anchors": [
            "Ran 10k through the park this morning",
            "Completed my morning run before work",
            "Ran five miles in the early fog",
            "Finished my weekend trail run",
        ],
    },
    {
        "category": "fitness",
        "roast": "You lifted heavy metal just to put it right back down.",
        "anchors": [
            "Hit a new bench press PR today",
            "Squatted 140kg for a new personal record",
            "Deadlifted my personal best this morning",
            "Crushed a heavy leg day at the gym",
        ],
    },
    {
        "category": "fitness",
        "roast": "Sunday league glory is just tomorrow morning's knee brace.",
        "anchors": [
            "Scored the winning goal in soccer today",
            "Our football team won the championship",
            "Won our weekend five a side league",
            "Scored twice in our pickup soccer match",
        ],
    },
    {
        "category": "fitness",
        "roast": "Waking up at dawn to be exhausted by noon is vanity.",
        "anchors": [
            "Woke up at 5 am for gym workout",
            "Started my workout before sunrise today",
            "Trained at dawn before anyone was awake",
            "Hit the gym at 5:30 am sharp",
        ],
    },
    {
        "category": "fitness",
        "roast": "You sat on a sofa while eleven strangers did your cardio.",
        "anchors": [
            "My football club won the derby today",
            "Arsenal won their match 3-0 tonight",
            "Manchester United won the cup match",
            "Real Madrid took home the victory",
        ],
    },
    {
        "category": "fitness",
        "roast": "You are thirty-two years old. The NBA is not calling.",
        "anchors": [
            "Hit three pointers all night at pickup basketball",
            "Won our rec league basketball tournament",
            "Balled out with friends at the court",
            "Drained the game winning basketball shot",
        ],
    },
    {
        "category": "fitness",
        "roast": "Congratulations on existing in three-dimensional physical space today.",
        "anchors": [
            "Hit 10,000 steps on my Apple Watch",
            "Walked ten thousand steps before evening",
            "Closed all three fitness activity rings",
            "Walked twelve thousand steps around the city",
        ],
    },
    {
        "category": "fitness",
        "roast": "A marathon sticker on your bumper will not reduce traffic.",
        "anchors": [
            "Finished my first full marathon today",
            "Crossed the marathon finish line strong",
            "Completed the 26.2 mile race",
            "Ran across the city marathon finish line",
        ],
    },
    {
        "category": "fitness",
        "roast": "Your cold plunge is just shivering with an expensive thermometer.",
        "anchors": [
            "Did a three minute ice bath this morning",
            "Took a freezing cold plunge before breakfast",
            "Started daily cold plunge therapy",
            "Embraced the cold with an ice bath",
        ],
    },
    {
        "category": "fitness",
        "roast": "Drinking a thirty dollar protein shake will not fix posture.",
        "anchors": [
            "Drank my post workout protein smoothie",
            "Hit my daily protein macronutrient goal",
            "Dialed in my workout nutrition perfectly",
            "Prepped my clean high-protein meals",
        ],
    },
    {
        "category": "fitness",
        "roast": "Buying carbon-fiber running shoes will not make you faster.",
        "anchors": [
            "Bought new marathon racing shoes today",
            "Upgraded to carbon plate running shoes",
            "Got the latest running sneakers for race day",
            "Invested in elite road racing shoes",
        ],
    },
    {
        "category": "fitness",
        "roast": "Holding a plank for two minutes just prolongs your misery.",
        "anchors": [
            "Held a three minute plank this morning",
            "Set a personal record on plank duration",
            "Completed my core plank workout challenge",
            "Held an unbroken core plank today",
        ],
    },
    {
        "category": "fitness",
        "roast": "A gym selfie is proof you paid for the lighting.",
        "anchors": [
            "Feeling proud of my gym progress today",
            "Progress photo after six months of lifting",
            "Consistency in the gym is showing results",
            "Proud of my physical transformation journey",
        ],
    },
    {
        "category": "fitness",
        "roast": "Biking fifty miles in full spandex will not impress motorists.",
        "anchors": [
            "Cycled fifty miles on the highway today",
            "Completed a century bike ride this weekend",
            "Rode fifty kilometers through the hills",
            "Finished a grueling road cycling session",
        ],
    },
    {
        "category": "fitness",
        "roast": "Your smartwatch burned more battery than you burned real calories.",
        "anchors": [
            "Burned 800 active calories in my workout",
            "Tracked a high intensity workout session",
            "Crushed my daily active calorie target",
            "Maxed out my daily calorie burn goal",
        ],
    },

    # --- PRODUCTIVITY (15) ---
    {
        "category": "productivity",
        "roast": "Color-coding your calendar does not mean you will do anything.",
        "anchors": [
            "Color coded my entire weekly schedule",
            "Organized my Google Calendar with colors",
            "Mapped out my hourly time blocks",
            "Built a pristine time-blocked calendar",
        ],
    },
    {
        "category": "productivity",
        "roast": "Setting up another Notion workspace will not fix your procrastination.",
        "anchors": [
            "Organized my life in a new Notion template",
            "Built an aesthetic Notion dashboard",
            "Migrated all my tasks into Notion",
            "Set up a second brain Notion system",
        ],
    },
    {
        "category": "productivity",
        "roast": "Inbox zero is just an empty room waiting for spam.",
        "anchors": [
            "Reached inbox zero across all email accounts",
            "Cleared all two hundred unread emails today",
            "Cleaned out my work inbox completely",
            "Inbox is finally empty at zero",
        ],
    },
    {
        "category": "productivity",
        "roast": "Waking up at four in the morning only impresses squirrels.",
        "anchors": [
            "Started my day at 4:30 am sharp",
            "Joined the 5 am club this morning",
            "Woke up early before the rest of the world",
            "Consistent 4 am morning routine",
        ],
    },
    {
        "category": "productivity",
        "roast": "Buying a leather journal will not give you better thoughts.",
        "anchors": [
            "Bought a gorgeous leather-bound journal",
            "Started writing in my new paper diary",
            "Invested in a premium fountain pen notebook",
            "Began morning pages in my journal",
        ],
    },
    {
        "category": "productivity",
        "roast": "You checked off five tiny tasks to avoid the one.",
        "anchors": [
            "Checked off ten items on my to-do list",
            "Completed almost all my checklist tasks today",
            "Made huge progress on my daily checklist",
            "Ticked off everything on my reminder app",
        ],
    },
    {
        "category": "productivity",
        "roast": "Arranging your desk supplies is not the same as working.",
        "anchors": [
            "Organized and tidied my entire desk today",
            "Decluttered my home office workspace",
            "Arranged all my stationery neatly",
            "Created a pristine minimalist desk setup",
        ],
    },
    {
        "category": "productivity",
        "roast": "Listening to white noise will not generate your missing ideas.",
        "anchors": [
            "Worked for three hours with brown noise",
            "Focused deeply with ambient binaural beats",
            "Used background rain sounds for deep work",
            "Listened to white noise while studying",
        ],
    },
    {
        "category": "productivity",
        "roast": "A time tracking app just measures how long you hesitated.",
        "anchors": [
            "Tracked every hour of my productive day",
            "Logged six focused hours on Toggl",
            "Used a pomodoro timer for all tasks",
            "Measured my deep work hours today",
        ],
    },
    {
        "category": "productivity",
        "roast": "Reading productivity books is your favorite way to delay action.",
        "anchors": [
            "Finished reading another book on productivity",
            "Read Atomic Habits for the second time",
            "Studied Deep Work by Cal Newport",
            "Learned so much from a time management book",
        ],
    },
    {
        "category": "productivity",
        "roast": "Your second brain is just as disorganized as the first.",
        "anchors": [
            "Built a digital second brain in Obsidian",
            "Organized all my notes with the PARA method",
            "Connected all my thoughts in Obsidian notes",
            "Created a knowledge graph of my life",
        ],
    },
    {
        "category": "productivity",
        "roast": "A ninety-minute focus block where you just stared at slack.",
        "anchors": [
            "Completed a two hour deep work block",
            "Did unbroken deep focus for ninety minutes",
            "Put my phone in another room for deep work",
            "Dedicated my morning to uninterrupted focus",
        ],
    },
    {
        "category": "productivity",
        "roast": "Decluttering your browser tabs just buries what you forgot.",
        "anchors": [
            "Closed fifty open browser tabs today",
            "Cleaned up my messy browser windows",
            "Organized my bookmarks and browser tabs",
            "Finally closed all sixty browser tabs",
        ],
    },
    {
        "category": "productivity",
        "roast": "A habit tracker cannot track the willpower you ran out of.",
        "anchors": [
            "Maintained a thirty day habit streak",
            "Kept my habit tracker streak alive",
            "Completed every habit on my tracker today",
            "Hit a 50 day streak on my habit app",
        ],
    },
    {
        "category": "productivity",
        "roast": "You optimized your morning routine until the morning was over.",
        "anchors": [
            "Perfected my ten step morning routine",
            "Followed my morning wellness routine perfectly",
            "Executed my morning habits without delay",
            "Tuned my morning ritual for peak performance",
        ],
    },

    # --- MONEY (15) ---
    {
        "category": "money",
        "roast": "Saving five dollars on coffee will not buy a home.",
        "anchors": [
            "Made coffee at home instead of buying Starbucks",
            "Saved money by skipping specialty coffee today",
            "Cut out expensive iced coffee drinks",
            "Brewed my own coffee to save cash",
        ],
    },
    {
        "category": "money",
        "roast": "Checking your investment portfolio twelve times daily will not raise stocks.",
        "anchors": [
            "Checked my investment portfolio returns today",
            "Watched my index fund portfolio grow",
            "Reviewed my retirement account balance",
            "Monitored my stock market dividend gains",
        ],
    },
    {
        "category": "money",
        "roast": "Paid off your credit card just in time for bills.",
        "anchors": [
            "Finally paid off all my credit card debt",
            "Brought my credit card balance down to zero",
            "Cleared my credit card statements completely",
            "Zero credit card balance achieved today",
        ],
    },
    {
        "category": "money",
        "roast": "Your high yield savings account pays less than your snacks.",
        "anchors": [
            "Opened a high yield savings account today",
            "Transferred my emergency fund to high yield",
            "Earning 5% interest on my savings account",
            "Optimized my cash into a high yield account",
        ],
    },
    {
        "category": "money",
        "roast": "Buying index funds is exciting until inflation outpaces your returns.",
        "anchors": [
            "Maxed out my annual Roth IRA contributions",
            "Invested my monthly paycheck in index funds",
            "Automated my S&P 500 index investments",
            "Funded my retirement investment account fully",
        ],
    },
    {
        "category": "money",
        "roast": "You bargained for ten minutes to save two dollars.",
        "anchors": [
            "Haggled and got a great discount today",
            "Negotiated a lower price on my purchase",
            "Got a ten percent discount by asking",
            "Scored a great deal at the market",
        ],
    },
    {
        "category": "money",
        "roast": "Making a spreadsheet budget will not stop your impulsive purchases.",
        "anchors": [
            "Built a detailed monthly expense spreadsheet",
            "Tracked every single dollar in my budget",
            "Created a comprehensive personal finance budget",
            "Budgeted my monthly spending down to the cent",
        ],
    },
    {
        "category": "money",
        "roast": "Canceling an unused streaming subscription is not financial freedom.",
        "anchors": [
            "Canceled three streaming subscriptions I never use",
            "Cleaned up all my recurring subscriptions",
            "Cut unnecessary subscription costs today",
            "Saved monthly money by canceling unused apps",
        ],
    },
    {
        "category": "money",
        "roast": "Your side hustle earns eighty cents an hour after expenses.",
        "anchors": [
            "Made my first dollar on my side hustle",
            "Earned money from my passive income project",
            "My side business made its first profit",
            "Generated side income over the weekend",
        ],
    },
    {
        "category": "money",
        "roast": "A five percent cashback card is useless if you overspend.",
        "anchors": [
            "Got approved for a premium cashback credit card",
            "Maximized all my credit card reward points",
            "Earned 5% cashback on all my spending",
            "Redeemed travel reward points from credit cards",
        ],
    },
    {
        "category": "money",
        "roast": "You bought generic brand toilet paper and called it frugality.",
        "anchors": [
            "Switched to store brand groceries to save money",
            "Bought generic products at the supermarket",
            "Saved twenty percent by buying store brands",
            "Practiced smart frugality at the grocery store",
        ],
    },
    {
        "category": "money",
        "roast": "Checking your credit score daily will not make it rise.",
        "anchors": [
            "My credit score just reached 800",
            "Hit an excellent credit score rating today",
            "Credit score went up ten points this month",
            "Checked my credit score and it's near perfect",
        ],
    },
    {
        "category": "money",
        "roast": "Packing your lunch took longer than buying the sandwich.",
        "anchors": [
            "Prepped homemade lunch for the work week",
            "Packed my own lunch instead of eating out",
            "Brought homemade food to the office today",
            "Saved money by meal prepping office lunches",
        ],
    },
    {
        "category": "money",
        "roast": "Buying crypto at the peak is an expensive education.",
        "anchors": [
            "Bought Bitcoin during the recent dip",
            "Added Ethereum to my crypto portfolio",
            "Invested in cryptocurrency assets today",
            "My crypto holdings gained value this week",
        ],
    },
    {
        "category": "money",
        "roast": "You saved ten dollars using a coupon on useless junk.",
        "anchors": [
            "Used coupons to save money on shopping",
            "Found a 20% off promo code at checkout",
            "Saved thirty dollars with retail store coupons",
            "Got discounts on everything in my shopping cart",
        ],
    },

    # --- DATING (15) ---
    {
        "category": "dating",
        "roast": "A fantastic first date is just tomorrow's unread text message.",
        "anchors": [
            "Had an amazing first date tonight",
            "The chemistry on our first date was electric",
            "Had great conversation over dinner with someone new",
            "First date went so well we talked for hours",
        ],
    },
    {
        "category": "dating",
        "roast": "Deleting dating apps for three days is not spiritual growth.",
        "anchors": [
            "Deleted all my dating apps today",
            "Taking a detox break from online dating",
            "Removed Tinder and Hinge from my phone",
            "Done with dating apps to focus on myself",
        ],
    },
    {
        "category": "dating",
        "roast": "Celebrating one month together is just counting days before reality.",
        "anchors": [
            "Celebrated one month of dating my partner",
            "One month anniversary with someone special",
            "Marked our first month together as a couple",
            "One month in and everything feels magical",
        ],
    },
    {
        "category": "dating",
        "roast": "They were not your soulmate. They just liked the playlist.",
        "anchors": [
            "Met someone with the exact same taste in music",
            "We have identical taste in songs and movies",
            "Bonded over obscure indie bands on our date",
            "Our shared music playlist is pure perfection",
        ],
    },
    {
        "category": "dating",
        "roast": "Making eye contact across a bookstore is not a romance.",
        "anchors": [
            "Exchanged cute smiles with a stranger at the cafe",
            "Had a movie moment with someone in a bookstore",
            "Met someone organically without dating apps",
            "Locked eyes with an attractive stranger today",
        ],
    },
    {
        "category": "dating",
        "roast": "A couple's cooking date just creates twice as many dishes.",
        "anchors": [
            "Cooked an intimate dinner together with my partner",
            "Had a romantic home cooking date night",
            "Made homemade pasta together with my significant other",
            "Cooked dinner from scratch as a couple",
        ],
    },
    {
        "category": "dating",
        "roast": "Matching shirts is a relationship milestone nobody asked to witness.",
        "anchors": [
            "Wore matching couple outfits with my partner",
            "Coordinated our clothes for date night",
            "Dressed up in matching colors together",
            "Rocked matching couple hoodies today",
        ],
    },
    {
        "category": "dating",
        "roast": "Posting your anniversary photo is just demanding applause from strangers.",
        "anchors": [
            "Posted our anniversary photo on Instagram",
            "Celebrated our anniversary on social media",
            "Shared cute pictures of us together today",
            "Marked three years together with a photo",
        ],
    },
    {
        "category": "dating",
        "roast": "A double date is just an audition for polite small talk.",
        "anchors": [
            "Had a wonderful double date with close friends",
            "Went on a fun double date this weekend",
            "Hosted another couple for dinner date night",
            "Enjoyed a great double date evening out",
        ],
    },
    {
        "category": "dating",
        "roast": "A picnic date is just eating lukewarm cheese near insects.",
        "anchors": [
            "Packed a romantic picnic in the park today",
            "Had a lovely outdoor picnic with my date",
            "Enjoyed wine and cheese at a park picnic",
            "Spent a sunny afternoon on a picnic date",
        ],
    },
    {
        "category": "dating",
        "roast": "They did not laugh at your joke because it was funny.",
        "anchors": [
            "Made my date laugh until they cried tonight",
            "My jokes landed so well on our dinner date",
            "We laughed non-stop throughout the entire date",
            "Kept my date laughing all evening long",
        ],
    },
    {
        "category": "dating",
        "roast": "Moving in together just divides the blame for dirty dishes.",
        "anchors": [
            "Signed our first apartment lease together",
            "Moved in with my partner this weekend",
            "Unpacked boxes in our new shared home",
            "Officially living together under one roof",
        ],
    },
    {
        "category": "dating",
        "roast": "A handwritten love letter will look awkward in divorce proceedings.",
        "anchors": [
            "Wrote a heartfelt love letter to my partner",
            "Gave my significant other a handwritten note",
            "Exchanged sweet love letters this morning",
            "Wrote down all the reasons I love them",
        ],
    },
    {
        "category": "dating",
        "roast": "Meeting their parents is just an unpaid background investigation.",
        "anchors": [
            "Met my partner's parents for the first time",
            "Dinner with their family went smoothly",
            "Their parents welcomed me so warmly today",
            "Survived meeting the parents over the weekend",
        ],
    },
    {
        "category": "dating",
        "roast": "You agreed on a weekend getaway. Prepare for mutual exhaustion.",
        "anchors": [
            "Booked a romantic weekend trip together",
            "Going on our first couple's getaway trip",
            "Planned a cozy weekend cabin trip as a couple",
            "Taking a romantic road trip this weekend",
        ],
    },

    # --- ACADEMIA (15) ---
    {
        "category": "academia",
        "roast": "A perfect grade on the exam will impress zero employers.",
        "anchors": [
            "Scored 100 percent on my physics exam",
            "Aced my organic chemistry midterm",
            "Got top marks in our university cohort",
            "Received the highest score on my finals",
        ],
    },
    {
        "category": "academia",
        "roast": "Finishing your master thesis just earns you an overqualified rejection.",
        "anchors": [
            "Submitted my master thesis after months of work",
            "Finished defending my master dissertation",
            "Turned in the final draft of my master thesis",
            "Successfully defended my thesis today",
        ],
    },
    {
        "category": "academia",
        "roast": "A published paper will be read by your advisor and nobody else.",
        "anchors": [
            "My first peer-reviewed paper was accepted",
            "Published research in a reputable journal",
            "Paper got accepted for publication today",
            "Research paper officially published in IEEE",
        ],
    },
    {
        "category": "academia",
        "roast": "Highlighting the whole textbook does not count as retaining knowledge.",
        "anchors": [
            "Highlighted four chapters of my textbook today",
            "Read and annotated my university readings",
            "Took detailed study notes across the textbook",
            "Finished reading all required course materials",
        ],
    },
    {
        "category": "academia",
        "roast": "Your professor forgot your name five minutes after office hours.",
        "anchors": [
            "Had a deep academic talk with my professor",
            "Professor gave great feedback during office hours",
            "Connected meaningfully with my department dean",
            "Had a great meeting with my faculty advisor",
        ],
    },
    {
        "category": "academia",
        "roast": "Graduating with honors just adds six syllables to your debt.",
        "anchors": [
            "Graduated magna cum laude from university",
            "Finished my degree with highest honors",
            "Earned top academic distinction at graduation",
            "Completed my bachelor degree with first class honors",
        ],
    },
    {
        "category": "academia",
        "roast": "Pulling an all-nighter is poor time management disguised as dedication.",
        "anchors": [
            "Pulled an all-nighter to finish my essay",
            "Studied all night in the university library",
            "Stayed up until dawn preparing for exams",
            "Crammed all night and submitted on time",
        ],
    },
    {
        "category": "academia",
        "roast": "A research grant is permission to do clerical work for years.",
        "anchors": [
            "Won a competitive academic research grant",
            "Awarded funding for my doctoral research",
            "Secured a university grant for our lab",
            "Research proposal received full funding",
        ],
    },
    {
        "category": "academia",
        "roast": "Your literature review is just paraphrasing seventy people who were wrong.",
        "anchors": [
            "Finished the literature review for my thesis",
            "Synthesized eighty academic papers for my review",
            "Completed the background literature chapter",
            "Organized citations across my literature review",
        ],
    },
    {
        "category": "academia",
        "roast": "A conference presentation is twenty minutes of speaking to sleeping peers.",
        "anchors": [
            "Presented my research paper at the conference",
            "Delivered an oral presentation at academic summit",
            "Spoke at an international academic symposium",
            "Presented my findings to fellow researchers",
        ],
    },
    {
        "category": "academia",
        "roast": "Making color-coded study flashcards will not improve your recall.",
        "anchors": [
            "Made two hundred digital flashcards on Anki",
            "Created color-coded revision cards for exams",
            "Finished reviewing all my study flashcards",
            "Built a comprehensive flashcard deck for finals",
        ],
    },
    {
        "category": "academia",
        "roast": "A doctorate title just means relatives ask for medical advice.",
        "anchors": [
            "Finally passed my PhD defense today",
            "Officially earned my doctoral degree",
            "Defended my doctoral dissertation successfully",
            "Can officially call myself doctor now",
        ],
    },
    {
        "category": "academia",
        "roast": "Writing thirty pages of citations does not make you scholarly.",
        "anchors": [
            "Formatted fifty academic citations in APA format",
            "Organized my entire bibliography cleanly",
            "Completed the reference list for my term paper",
            "Cited forty peer-reviewed sources properly",
        ],
    },
    {
        "category": "academia",
        "roast": "A study group is four people complaining about the professor.",
        "anchors": [
            "Hosted a productive study session with classmates",
            "Formed an effective study group for exams",
            "Collaborated with peers on our group revision",
            "Had an inspiring study session at the library",
        ],
    },
    {
        "category": "academia",
        "roast": "Reading academic papers on a Friday night is a quiet tragedy.",
        "anchors": [
            "Spent Friday night reading journal articles",
            "Catching up on academic reading over the weekend",
            "Diving deep into research literature tonight",
            "Reading research papers instead of partying",
        ],
    },

    # --- COOKING (15) ---
    {
        "category": "cooking",
        "roast": "Spending four hours making pasta to eat it in six minutes.",
        "anchors": [
            "Made fresh handmade pasta from scratch today",
            "Rolled out homemade fettuccine for dinner",
            "Crafted artisanal pasta dough by hand",
            "Cooked fresh ravioli completely from scratch",
        ],
    },
    {
        "category": "cooking",
        "roast": "Your sourdough starter is just mold with emotional support.",
        "anchors": [
            "Fed my sourdough starter and it doubled",
            "Baked a rustic sourdough boule this morning",
            "My sourdough starter is alive and bubbly",
            "Got an open crumb on my sourdough loaf",
        ],
    },
    {
        "category": "cooking",
        "roast": "Plating food with tweezers will not make the chicken tender.",
        "anchors": [
            "Plated a restaurant quality dinner at home",
            "Arranged our dinner like a Michelin restaurant",
            "Focused on gourmet plating aesthetics tonight",
            "Garnished our home cooked meal beautifully",
        ],
    },
    {
        "category": "cooking",
        "roast": "A three hundred dollar dutch oven will not improve stew.",
        "anchors": [
            "Bought an enameled cast iron dutch oven",
            "Simmered beef bourguignon in my dutch oven",
            "Invested in a premium French dutch oven",
            "Braised dinner in my new cast iron pot",
        ],
    },
    {
        "category": "cooking",
        "roast": "You chopped garlic for twenty minutes to mask burnt vegetables.",
        "anchors": [
            "Diced fresh garlic and herbs for dinner",
            "Mince garlic finely for a homemade pasta sauce",
            "Prepped all aromatics from scratch tonight",
            "Infused extra virgin olive oil with fresh garlic",
        ],
    },
    {
        "category": "cooking",
        "roast": "A meal prep photo is just seven containers of sadness.",
        "anchors": [
            "Finished meal prepping lunches for the whole week",
            "Cooked healthy food in glass containers for work",
            "Prepped chicken rice and broccoli for five days",
            "Lined up my balanced weekly meal prep boxes",
        ],
    },
    {
        "category": "cooking",
        "roast": "Infusing your own olive oil is an expensive way to spill.",
        "anchors": [
            "Infused olive oil with rosemary and chili",
            "Made homemade rosemary garlic infused oil",
            "Bottled my own flavored extra virgin olive oil",
            "Crafted herb infused finishing oil for cooking",
        ],
    },
    {
        "category": "cooking",
        "roast": "A chef's knife does not cut down your dishwashing time.",
        "anchors": [
            "Sharpened my Japanese chef knife to a razor edge",
            "Used my new forged kitchen knife for dinner prep",
            "Invested in an authentic Japanese kitchen knife",
            "Knife skills were on point during prep today",
        ],
    },
    {
        "category": "cooking",
        "roast": "Calling it deconstructed just means you dropped the pie.",
        "anchors": [
            "Made a modern deconstructed dessert tonight",
            "Served a deconstructed cheesecake for guests",
            "Experimental deconstructed dinner presentation",
            "Created a deconstructed apple tart dessert",
        ],
    },
    {
        "category": "cooking",
        "roast": "Grilling a steak on cast iron will smoke your apartment.",
        "anchors": [
            "Got a perfect sear on my ribeye steak",
            "Cooked a restaurant steak in my cast iron skillet",
            "Basted a thick steak with butter and thyme",
            "Achieved a flawless medium rare steak sear",
        ],
    },
    {
        "category": "cooking",
        "roast": "Fermenting your own kombucha is just vinegar in disguise.",
        "anchors": [
            "Brewed a batch of homemade flavored kombucha",
            "My homemade kombucha fermented with great fizz",
            "Bottled second fermentation kombucha with fruit",
            "Growing my own kombucha scoby from scratch",
        ],
    },
    {
        "category": "cooking",
        "roast": "A five-course dinner for friends just means forty dirty plates.",
        "anchors": [
            "Cooked an elaborate multi-course meal for friends",
            "Hosted an intimate dinner party from scratch",
            "Served five courses to dinner party guests",
            "Made an entire banquet dinner for our friend group",
        ],
    },
    {
        "category": "cooking",
        "roast": "Baking French macarons is just paying thirty dollars for sugar.",
        "anchors": [
            "Baked delicate French macarons with clean feet",
            "Piped chocolate ganache macarons from scratch",
            "Mastered the tricky French macaron technique",
            "Baked a batch of colorful raspberry macarons",
        ],
    },
    {
        "category": "cooking",
        "roast": "Smoking brisket for sixteen hours will not speed up dinner.",
        "anchors": [
            "Smoked a beef brisket for sixteen hours",
            "Got a deep smoke ring on my smoked brisket",
            "Tended the barbecue smoker all night long",
            "Low and slow smoked barbecue turned out tender",
        ],
    },
    {
        "category": "cooking",
        "roast": "Homemade pesto is an elaborate excuse to consume pine nuts.",
        "anchors": [
            "Pounded fresh basil pesto in a mortar",
            "Made traditional Genoa pesto with fresh pine nuts",
            "Blended fragrant green pesto from garden herbs",
            "Harvested garden basil for homemade pesto sauce",
        ],
    },

    # --- TRAVEL (15) ---
    {
        "category": "travel",
        "roast": "Traveling across eight time zones to take pictures of convenience food.",
        "anchors": [
            "Landed in Tokyo for an exciting vacation",
            "Exploring convenience store snacks in Japan",
            "Arrived in Osaka for our food holiday",
            "Started our two week vacation across Tokyo",
        ],
    },
    {
        "category": "travel",
        "roast": "Hiking to the summit just to adjust camera exposure settings.",
        "anchors": [
            "Reached the mountain summit before sunrise today",
            "Climbed to the top of the mountain peak",
            "Hiked the steep trail to catch the sunrise view",
            "Stood at the mountain ridge overlooking clouds",
        ],
    },
    {
        "category": "travel",
        "roast": "An exotic beach resort is just answering Slack while sunburned.",
        "anchors": [
            "Booked our tropical beach getaway in Bali",
            "Relaxing poolside at a tropical beach resort",
            "Landed on the coast for a week by the ocean",
            "Enjoying the warm sand and ocean breezes",
        ],
    },
    {
        "category": "travel",
        "roast": "A digital nomad is an unemployed tourist with a laptop.",
        "anchors": [
            "Working remotely from a coffee shop in Lisbon",
            "Officially living the digital nomad remote lifestyle",
            "Basing myself in Southeast Asia for remote work",
            "Working online while traveling around the globe",
        ],
    },
    {
        "category": "travel",
        "roast": "Solo travel is eating dinner alone while staring at walls.",
        "anchors": [
            "Started my first solo backpacking adventure",
            "Traveling alone across Europe with a backpack",
            "Embracing independence on my solo trip",
            "Solo travel has taught me so much about life",
        ],
    },
    {
        "category": "travel",
        "roast": "A passport stamp will not make you more culturally enlightened.",
        "anchors": [
            "Added another country stamp to my passport",
            "Visited my thirtieth country in the world",
            "Collected three new passport stamps this trip",
            "Crossed the border into country number twenty-five",
        ],
    },
    {
        "category": "travel",
        "roast": "Packing only a carry-on is an odd source of pride.",
        "anchors": [
            "Packed for a two week trip in one carry-on",
            "Traveled carry-on only without checking bags",
            "Mastered minimalist one-bag travel techniques",
            "Fitting everything for Europe into a single backpack",
        ],
    },
    {
        "category": "travel",
        "roast": "Taking photos in a lavender field is basic tourist behavior.",
        "anchors": [
            "Walked through the lavender fields in Provence",
            "Took gorgeous photos in blooming flower fields",
            "Visited the purple lavender meadows today",
            "Enjoyed the fragrance in the lavender fields",
        ],
    },
    {
        "category": "travel",
        "roast": "A boutique hostel is still sleeping three feet from strangers.",
        "anchors": [
            "Checked into a stylish boutique hostel in Berlin",
            "Staying at an eco-friendly designer hostel",
            "Met cool fellow travelers at our hostel lounge",
            "Enjoying the social vibe of our city hostel",
        ],
    },
    {
        "category": "travel",
        "roast": "A sunrise hot air balloon ride is just windy heights.",
        "anchors": [
            "Flew in a hot air balloon over Cappadocia",
            "Watched sunrise from a hot air balloon basket",
            "Floating high above the valleys in a balloon",
            "Incredible hot air balloon views this morning",
        ],
    },
    {
        "category": "travel",
        "roast": "Visiting hidden gems that twenty million tourists reviewed on TripAdvisor.",
        "anchors": [
            "Found an untouched hidden gem away from crowds",
            "Discovered a secret alleyway in Rome",
            "Explored off the beaten path local spots",
            "Avoided tourist traps and found hidden locations",
        ],
    },
    {
        "category": "travel",
        "roast": "Airport lounge access is just waiting in carpeted holding rooms.",
        "anchors": [
            "Enjoyed free drinks at the airport business lounge",
            "Relaxing in the priority pass airport lounge",
            "Complimentary lounge access before my flight",
            "Waiting for boarding in the first class lounge",
        ],
    },
    {
        "category": "travel",
        "roast": "Taking a cooking class in Italy will not make you Italian.",
        "anchors": [
            "Took a traditional pasta making class in Florence",
            "Learned authentic cooking from a Tuscan chef",
            "Attended an Italian culinary masterclass today",
            "Made homemade gnocchi with a local Italian cook",
        ],
    },
    {
        "category": "travel",
        "roast": "Renting a scooter abroad is just risking unfamiliar asphalt.",
        "anchors": [
            "Rented a scooter to explore the island roads",
            "Riding mopeds through coastal roads with friends",
            "Cruised the island coast on a rental scooter",
            "Exploring rural villages on a motorbike rental",
        ],
    },
    {
        "category": "travel",
        "roast": "Visiting ancient ruins just means reading plaques in the sun.",
        "anchors": [
            "Walked among the ancient ruins of Athens",
            "Explored the historic archaeological park today",
            "Stood before ancient Roman temple pillars",
            "Visited the ancient amphitheater ruins",
        ],
    },

    # --- SELF_CARE (15) ---
    {
        "category": "self_care",
        "roast": "Lighting a forty-dollar candle will not burn away your responsibilities.",
        "anchors": [
            "Lit an expensive scented candle for relaxation",
            "Unwinding with a luxury candle tonight",
            "Created a calm ambiance with scented candles",
            "Burned a fragrant artisan candle while resting",
        ],
    },
    {
        "category": "self_care",
        "roast": "A twenty-minute meditation where you just worried about your schedule.",
        "anchors": [
            "Meditated for twenty mindful minutes this morning",
            "Completed my daily mindfulness meditation practice",
            "Practiced deep mindful breathing to center myself",
            "Sat in stillness for twenty minutes of meditation",
        ],
    },
    {
        "category": "self_care",
        "roast": "Drinking herbal tea will not solve your structural life choices.",
        "anchors": [
            "Brewed a warm cup of calming chamomile tea",
            "Sipping hot herbal tea to soothe evening stress",
            "Enjoying loose leaf herbal tea before bedtime",
            "Drinking calming green tea for mindfulness",
        ],
    },
    {
        "category": "self_care",
        "roast": "A facial sheet mask is just wet paper on regret.",
        "anchors": [
            "Did a soothing sheet mask skincare routine",
            "Treated my skin to a hydrating face mask",
            "Pampered myself with a multi-step skincare session",
            "Rejuvenating skin with a luxury Korean sheet mask",
        ],
    },
    {
        "category": "self_care",
        "roast": "Taking a bubble bath is just soaking in your own thoughts.",
        "anchors": [
            "Took a relaxing warm bubble bath after work",
            "Soaked in an Epsom salt bath with candles",
            "Unwinding in a long hot bubble bath tonight",
            "Ran a soothing evening bath to de-stress",
        ],
    },
    {
        "category": "self_care",
        "roast": "Saying no to plans is just practicing your anti-social habits.",
        "anchors": [
            "Protected my peace by declining social invitations",
            "Set healthy boundaries by saying no to plans",
            "Prioritized myself and stayed home tonight",
            "Saying no to events to recharge my energy",
        ],
    },
    {
        "category": "self_care",
        "roast": "Journaling three grateful things will not change your landlord's notice.",
        "anchors": [
            "Wrote down three things I am grateful for",
            "Logged my daily gratitude list in my journal",
            "Counted my blessings in my gratitude notebook",
            "Practiced gratitude before starting the morning",
        ],
    },
    {
        "category": "self_care",
        "roast": "A sound bath is just paying to hear someone clang.",
        "anchors": [
            "Attended a restorative Tibetan sound bath session",
            "Relaxed deeply during a crystal bowl sound healing",
            "Experienced vibrational healing in a sound bath",
            "Surrendered to meditative gong and bowl soundscapes",
        ],
    },
    {
        "category": "self_care",
        "roast": "Buying organic groceries is just paying double for dirt.",
        "anchors": [
            "Bought all organic fresh produce at the market",
            "Stocked the fridge with local organic vegetables",
            "Invested in clean chemical-free organic groceries",
            "Switched entirely to organic whole foods",
        ],
    },
    {
        "category": "self_care",
        "roast": "Setting a screen time limit that you override every ten minutes.",
        "anchors": [
            "Set strict screen time limits on my smartphone",
            "Digital detox limits configured for social apps",
            "Restricted my daily phone app usage limits",
            "Taking control of screen time with app limits",
        ],
    },
    {
        "category": "self_care",
        "roast": "Going for a mental health walk is just pacing outdoors.",
        "anchors": [
            "Took an afternoon mental health walk outside",
            "Went for a gentle walk to clear my head",
            "Stepped out for fresh air and mental clarity",
            "Cleared anxious thoughts with a walk in nature",
        ],
    },
    {
        "category": "self_care",
        "roast": "A jade roller will not smooth over your credit score.",
        "anchors": [
            "Used a chilled jade roller for facial lymphatic drainage",
            "Did my morning facial massage with a quartz roller",
            "Depuffed my face with a cold jade roller",
            "Practiced gua sha and jade rolling on my face",
        ],
    },
    {
        "category": "self_care",
        "roast": "Decluttering your closet is just moving dust around the room.",
        "anchors": [
            "Decluttered my wardrobe using the Marie Kondo method",
            "Donated four bags of clothes I no longer wear",
            "Organized my minimalist capsule wardrobe today",
            "Purged my bedroom closet of unnecessary clutter",
        ],
    },
    {
        "category": "self_care",
        "roast": "Drinking three liters of water will only increase bathroom visits.",
        "anchors": [
            "Drank three full liters of water today",
            "Hit my daily hydration water gallon goal",
            "Stayed hydrated with sixty-four ounces of water",
            "Carried my water bottle everywhere and drank plenty",
        ],
    },
    {
        "category": "self_care",
        "roast": "A weekend digital detox where you kept checking the time.",
        "anchors": [
            "Spent an entire weekend completely off screens",
            "Unplugged from technology for 24 peaceful hours",
            "Did a full weekend digital detox in nature",
            "Turned off all electronics to disconnect and recharge",
        ],
    },
]


def validate_candidates(candidates: list[dict]):
    """Strictly assert character count, word count <= 14, no exclamation marks, no emojis."""
    emoji_pattern = re.compile(
        r"[\U00010000-\U0010ffff\u2600-\u26ff\u2700-\u27bf]", flags=re.UNICODE
    )
    for idx, c in enumerate(candidates):
        roast = c["roast"]
        words = roast.split()
        if len(words) > 14:
            raise ValueError(f"Candidate #{idx} exceeds 14 words ({len(words)}): '{roast}'")
        if "!" in roast:
            raise ValueError(f"Candidate #{idx} contains exclamation mark: '{roast}'")
        if emoji_pattern.search(roast):
            raise ValueError(f"Candidate #{idx} contains emoji: '{roast}'")
        if len(c["anchors"]) != 4:
            raise ValueError(f"Candidate #{idx} must have exactly 4 anchors, got {len(c['anchors'])}")
    print(f"[+] All {len(candidates)} candidates passed syntactic & constraint validations.")


def run_semantic_dedup(
    candidates: list[dict],
    existing_roasts: list[dict],
    model: SentenceTransformer,
    sim_threshold: float = 0.88,
) -> list[dict]:
    """
    Computes pairwise cosine similarity between candidate roasts and existing roasts,
    as well as within the candidate set. Prunes any with similarity > sim_threshold.
    """
    print(f"\n--- Running Semantic Deduplication Pass (threshold: {sim_threshold}) ---")
    existing_texts = [r["roast"] for r in existing_roasts]
    existing_embs = model.encode(existing_texts, normalize_embeddings=True) if existing_texts else np.empty((0, 384))

    accepted: list[dict] = []
    accepted_embs: list[np.ndarray] = []

    pruned_count = 0

    for i, cand in enumerate(candidates):
        cand_text = cand["roast"]
        cand_emb = model.encode([cand_text], normalize_embeddings=True)[0]

        is_duplicate = False

        # 1. Compare against existing roasts
        if len(existing_embs) > 0:
            sims_existing = np.dot(existing_embs, cand_emb)
            max_sim_existing = np.max(sims_existing)
            if max_sim_existing > sim_threshold:
                match_idx = np.argmax(sims_existing)
                print(f"[PRUNED] Candidate #{i} matches existing roast ({max_sim_existing:.3f}):")
                print(f"  Candidate: '{cand_text}'")
                print(f"  Existing:  '{existing_texts[match_idx]}'")
                is_duplicate = True
                pruned_count += 1
                continue

        # 2. Compare against already accepted new candidates
        if len(accepted_embs) > 0:
            accepted_matrix = np.array(accepted_embs)
            sims_accepted = np.dot(accepted_matrix, cand_emb)
            max_sim_accepted = np.max(sims_accepted)
            if max_sim_accepted > sim_threshold:
                match_idx = np.argmax(sims_accepted)
                print(f"[PRUNED] Candidate #{i} matches accepted candidate #{match_idx} ({max_sim_accepted:.3f}):")
                print(f"  Candidate: '{cand_text}'")
                print(f"  Accepted:  '{accepted[match_idx]['roast']}'")
                is_duplicate = True
                pruned_count += 1
                continue

        if not is_duplicate:
            accepted.append(cand)
            accepted_embs.append(cand_emb)

    print(f"\n[+] Deduplication complete. Kept: {len(accepted)} / {len(candidates)} (Pruned: {pruned_count})")
    return accepted


def main():
    print("=" * 60)
    print("Mr.Roast Bank Expansion & Semantic Deduplication Pipeline")
    print("=" * 60)

    # 1. Validate candidates
    validate_candidates(SEED_ROASTS)

    # 2. Load existing dataset
    if DATA_FILE.exists():
        with open(DATA_FILE, "r", encoding="utf-8") as f:
            existing_roasts = json.load(f)
    else:
        existing_roasts = []

    print(f"[+] Loaded {len(existing_roasts)} existing roasts from {DATA_FILE}")

    # 3. Load SentenceTransformer
    print("[*] Loading SentenceTransformer 'sentence-transformers/all-MiniLM-L6-v2'...")
    model = SentenceTransformer("sentence-transformers/all-MiniLM-L6-v2")

    # 4. Semantic deduplication pass
    accepted_candidates = run_semantic_dedup(
        SEED_ROASTS, existing_roasts, model, sim_threshold=0.88
    )

    # 5. Assign IDs and format
    existing_ids = {r["id"] for r in existing_roasts}
    category_counts = {}
    for r in existing_roasts:
        cat = r.get("category", "generic")
        category_counts[cat] = category_counts.get(cat, 0) + 1

    formatted_new_roasts = []
    for item in accepted_candidates:
        cat = item["category"]
        category_counts[cat] = category_counts.get(cat, 0) + 1
        new_id = f"{cat}-{category_counts[cat]:03d}"
        while new_id in existing_ids:
            category_counts[cat] += 1
            new_id = f"{cat}-{category_counts[cat]:03d}"

        existing_ids.add(new_id)

        formatted_entry = {
            "id": new_id,
            "category": cat,
            "anchors": item["anchors"],
            "paraphrases": [],
            "roast": item["roast"],
            "slots": [],
            "tone": "deadpan",
            "status": "draft",
        }
        formatted_new_roasts.append(formatted_entry)

    # 6. Merge and persist to dev_roasts.json
    merged_roasts = existing_roasts + formatted_new_roasts
    with open(DATA_FILE, "w", encoding="utf-8") as f:
        json.dump(merged_roasts, f, indent=2, ensure_ascii=False)

    print("\n" + "=" * 60)
    print("DATASET EXPANSION SUMMARY")
    print("=" * 60)
    print(f"Previous roasts count:  {len(existing_roasts)}")
    print(f"New roasts added:       {len(formatted_new_roasts)}")
    print(f"Total roasts now:       {len(merged_roasts)}")
    print(f"Saved to:               {DATA_FILE}")
    print("=" * 60)


if __name__ == "__main__":
    main()
