

# support initial add or update

https://api.mongodb.com/python/current/tutorial.html

# execute from javascript via python-shell
# args: mongodbUrl, init-dry|init|update-dry|update, input.xlsx, output.xlsx

# first iteration is ALWAYS a dry-run

syntax: python create-school-student --dry-run --dev  input.xlsx


# read input.xlsx
# level tab: level & levelId columns
# subject tab: subject & subjectId columns
# classroom: row=level (cell), column=subject (cell)
# steps
# create classroom (per schoolyear, per school)

# output to output.xlsx : userId, emails, level, class

