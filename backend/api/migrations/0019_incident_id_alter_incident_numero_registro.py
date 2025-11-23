from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("api", "0018_alter_inventariodados_unidade"),
    ]

    operations = [
        # 1️⃣ Primeiro, alterar numero_registro para remover primary_key
        migrations.AlterField(
            model_name="incident",
            name="numero_registro",
            field=models.PositiveIntegerField(
                unique=True,
                verbose_name="Número do registro",
            ),
        ),
        # 2️⃣ Criar o novo campo id (PK)
        migrations.AddField(
            model_name="incident",
            name="id",
            field=models.BigAutoField(
                auto_created=True, primary_key=True, serialize=False, verbose_name="ID"
            ),
        ),
    ]
